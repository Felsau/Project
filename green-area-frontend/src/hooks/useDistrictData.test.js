import { renderHook, act, waitFor } from '@testing-library/react';
import { useDistrictData } from './useDistrictData';
import { fetchWithRetry } from '../utils/fetchRetry';
import { pushError } from '../utils/toast';

// Only fetchDistrictNDVI is exercised here — it uses fetchWithRetry exclusively,
// so mocking that is enough to assert the last-click-wins abort we added.
// (jest.mock is hoisted above the imports above, so they receive the mocks.)
jest.mock('../utils/fetchRetry', () => ({ fetchWithRetry: jest.fn() }));
jest.mock('../utils/toast', () => ({ pushError: jest.fn() }));

const okJson = (body) => ({ ok: true, json: async () => body });

beforeEach(() => {
  fetchWithRetry.mockReset();
  pushError.mockReset();
});

test('fetchDistrictNDVI: a newer district fetch supersedes an older one', async () => {
  // District A only settles by rejecting on abort; district B resolves at once.
  fetchWithRetry.mockImplementation((url, opts) => {
    if (url.includes('DistrictA')) {
      return new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
      });
    }
    return Promise.resolve(okJson({ ndvi_mean: 0.42, monthly: [], lst_mean: 31 }));
  });
  const { result } = renderHook(() => useDistrictData());

  await act(async () => {
    result.current.fetchDistrictNDVI('Chiang Mai', 'DistrictA');       // superseded
    await result.current.fetchDistrictNDVI('Chiang Mai', 'DistrictB'); // wins
  });

  await waitFor(() =>
    expect(result.current.districtNdviStats).toEqual(
      expect.objectContaining({ ndvi_mean: 0.42 })));
  expect(result.current.districtNdviLoading).toBe(false);
  expect(pushError).not.toHaveBeenCalled();  // abort is silent
});
