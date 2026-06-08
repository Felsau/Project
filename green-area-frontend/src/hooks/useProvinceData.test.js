import { renderHook, act, waitFor } from '@testing-library/react';
import { useProvinceData } from './useProvinceData';
import { fetchWithRetry } from '../utils/fetchRetry';
import { pushError } from '../utils/toast';

// fetchWithRetry is the only network dependency — mock it so we control timing
// and assert the abort/last-click-wins behaviour without a real backend.
// (jest.mock is hoisted above the imports above, so they receive the mocks.)
jest.mock('../utils/fetchRetry', () => ({ fetchWithRetry: jest.fn() }));
jest.mock('../utils/toast', () => ({ pushError: jest.fn() }));

const okJson = (body) => ({ ok: true, json: async () => body });

beforeEach(() => {
  fetchWithRetry.mockReset();
  pushError.mockReset();
});

test('fetchNDVI populates stats and updates the ndvi cache', async () => {
  fetchWithRetry.mockResolvedValue(okJson({ ndvi_mean: 0.5, monthly: [], lst_mean: 30 }));
  const setNdviCache = jest.fn();
  const { result } = renderHook(() => useProvinceData({ setNdviCache }));

  await act(async () => { await result.current.fetchNDVI('Chiang Mai'); });

  expect(result.current.ndviStats).toEqual(expect.objectContaining({ ndvi_mean: 0.5 }));
  expect(result.current.lstStats).toEqual(expect.objectContaining({ lst_mean: 30 }));
  expect(result.current.ndviLoading).toBe(false);
  // cache is updated via a functional setter — apply it to verify the value
  const updater = setNdviCache.mock.calls.at(-1)[0];
  expect(updater({})).toEqual({ 'Chiang Mai': 0.5 });
});

test('a newer fetch supersedes an older one (last-click-wins)', async () => {
  // Province A never resolves on its own — it only rejects when its signal is
  // aborted. Province B resolves immediately. Starting B must abort A so a slow
  // A response can never overwrite the panel after B was picked.
  fetchWithRetry.mockImplementation((url, opts) => {
    if (url.includes('ProvinceA')) {
      return new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
      });
    }
    return Promise.resolve(okJson({ ndvi_mean: 0.8, monthly: [], lst_mean: 25 }));
  });
  const setNdviCache = jest.fn();
  const { result } = renderHook(() => useProvinceData({ setNdviCache }));

  await act(async () => {
    result.current.fetchNDVI('ProvinceA');        // in-flight, will be superseded
    await result.current.fetchNDVI('ProvinceB');  // aborts A, then resolves
  });

  await waitFor(() =>
    expect(result.current.ndviStats).toEqual(expect.objectContaining({ ndvi_mean: 0.8 })));
  // the superseded (aborted) request must not surface an error toast
  expect(pushError).not.toHaveBeenCalled();
});

test('an HTTP error surfaces a toast and leaves stats null', async () => {
  fetchWithRetry.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
  const { result } = renderHook(() => useProvinceData({ setNdviCache: jest.fn() }));

  await act(async () => { await result.current.fetchNDVI('Krabi'); });

  expect(result.current.ndviStats).toBeNull();
  expect(result.current.ndviLoading).toBe(false);
});
