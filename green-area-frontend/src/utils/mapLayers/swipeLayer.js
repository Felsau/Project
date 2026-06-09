// Swipe compare — two raster tile layers clipped left/right of a vertical
// divider, so two years (or metrics) can be compared on one map.
// Web-Mercator x is linear in longitude, so the screen split fraction maps
// exactly to a clip longitude between the viewport's west/east bounds.
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { ClipExtension } from '@deck.gl/extensions';

const clipExt = new ClipExtension();

const clippedRaster = (id, url, clipBounds, onViewportLoad) => new TileLayer({
  id,
  data: url,
  minZoom: 0,
  maxZoom: 19,
  tileSize: 256,
  opacity: 0.95,
  onViewportLoad,   // fires once this year's tiles for the viewport finish loading
  renderSubLayers: (props) => {
    const { boundingBox } = props.tile;
    return new BitmapLayer(props, {
      data: null,
      image: props.data,
      bounds: [
        boundingBox[0][0], boundingBox[0][1],
        boundingBox[1][0], boundingBox[1][1],
      ],
      extensions: [clipExt],
      clipBounds,  // [minLng, minLat, maxLng, maxLat] in lng/lat
    });
  },
});

// Full-province raster (no clip) — used for the single difference map.
const fullRaster = (id, url, onViewportLoad) => new TileLayer({
  id, data: url, minZoom: 0, maxZoom: 19, tileSize: 256, opacity: 0.95, onViewportLoad,
  renderSubLayers: (props) => {
    const { boundingBox } = props.tile;
    return new BitmapLayer(props, {
      data: null,
      image: props.data,
      bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]],
    });
  },
});

export const swipeLayers = (ctx) => {
  const { swipe, onTileLoad } = ctx;
  // difference mode → one full raster (no clip, no divider)
  if (swipe?.diffTile?.tile_url) {
    return [fullRaster('swipe-diff', swipe.diffTile.tile_url, () => onTileLoad?.('a'))];
  }
  // split mode → two clipped rasters left/right of the divider
  if (!swipe?.tileA?.tile_url || !swipe?.tileB?.tile_url || !swipe.bounds) return [];
  const [w, s, e, n] = swipe.bounds;
  const splitLng = w + (e - w) * swipe.split;
  return [
    clippedRaster('swipe-a', swipe.tileA.tile_url, [w, s, splitLng, n], () => onTileLoad?.('a')),
    clippedRaster('swipe-b', swipe.tileB.tile_url, [splitLng, s, e, n], () => onTileLoad?.('b')),
  ];
};
