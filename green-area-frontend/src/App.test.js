import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

vi.mock('@deck.gl/react', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="deckgl">{children}</div>,
}));
vi.mock('@deck.gl/layers', () => ({
  GeoJsonLayer: class {},
  BitmapLayer: class {},
  ScatterplotLayer: class {},
  TextLayer: class {},
}));
vi.mock('@deck.gl/geo-layers', () => ({ TileLayer: class {} }));
vi.mock('@deck.gl/extensions', () => ({ ClipExtension: class {} }));
vi.mock('@deck.gl/core', () => ({
  FlyToInterpolator: class {},
  WebMercatorViewport: class { getBounds() { return [0, 0, 1, 1]; } },
}));
vi.mock('@turf/turf', () => ({
  area: () => 0,
  bbox: () => [0, 0, 0, 0],
}));
vi.mock('react-map-gl/maplibre', () => ({ __esModule: true, default: () => null }));

beforeEach(() => {
  sessionStorage.clear();                              // landing gate ใช้ sessionStorage
  window.history.replaceState(null, '', '/');          // ล้าง deep-link param จาก test ก่อนหน้า
});

test('shows the landing page first', async () => {
  render(<App />);
  // findByRole รอ async fetch จบ → กัน act() warning จาก useEffect
  expect(await screen.findByRole('button', { name: /เข้าสู่แดชบอร์ด/ })).toBeInTheDocument();
});

test('enters the dashboard from the landing CTA', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: /เข้าสู่แดชบอร์ด/ }));
  expect(await screen.findByText('Green Area Analysis')).toBeInTheDocument();
  // overview panel shows when nothing selected
  expect(await screen.findByText('โหลดอันดับรายปี')).toBeInTheDocument();
});

test('deep-link params skip the landing page', async () => {
  window.history.replaceState(null, '', '/?tab=stats');
  render(<App />);
  expect(await screen.findByText('โหลดอันดับรายปี')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /เข้าสู่แดชบอร์ด/ })).not.toBeInTheDocument();
});
