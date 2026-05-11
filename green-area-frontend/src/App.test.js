import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('@deck.gl/react', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="deckgl">{children}</div>,
}));
jest.mock('@deck.gl/layers', () => ({
  GeoJsonLayer: class {},
  BitmapLayer: class {},
  ScatterplotLayer: class {},
  TextLayer: class {},
}));
jest.mock('@deck.gl/geo-layers', () => ({ TileLayer: class {} }));
jest.mock('@deck.gl/core', () => ({ FlyToInterpolator: class {} }));
jest.mock('@turf/turf', () => ({
  area: () => 0,
  bbox: () => [0, 0, 0, 0],
}));
jest.mock('react-map-gl/maplibre', () => ({ __esModule: true, default: () => null }));

test('renders app header', async () => {
  render(<App />);
  // findByText รอ async fetch จบ → กัน act() warning จาก useEffect
  expect(await screen.findByText('Green Area Analysis')).toBeInTheDocument();
});

test('shows overview panel when nothing selected', async () => {
  render(<App />);
  expect(await screen.findByText('ภาพรวมพื้นที่สีเขียว')).toBeInTheDocument();
});
