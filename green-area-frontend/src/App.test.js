import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('@deck.gl/react', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="deckgl">{children}</div>,
}));
jest.mock('@deck.gl/layers', () => ({ GeoJsonLayer: class {} }));
jest.mock('@deck.gl/core',   () => ({ FlyToInterpolator: class {} }));
jest.mock('react-map-gl/maplibre', () => ({ __esModule: true, default: () => null }));

global.fetch = jest.fn((url) => {
  if (url.includes('/cache')) {
    return Promise.resolve({ json: () => Promise.resolve({ annual: [], monthly: [] }) });
  }
  return Promise.resolve({
    json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }),
  });
});

test('renders app header', () => {
  render(<App />);
  expect(screen.getByText('Green Area Analysis')).toBeInTheDocument();
});

test('shows province selection hint when nothing selected', () => {
  render(<App />);
  expect(screen.getByText('เลือกพื้นที่')).toBeInTheDocument();
});
