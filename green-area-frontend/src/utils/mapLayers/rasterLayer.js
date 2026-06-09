// Live raster overlay (NDVI/LST XYZ tiles from GEE) drawn over the basemap.
import { BitmapLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';

export const rasterLayers = (ctx) => {
  const { rasterTileInfo } = ctx;
  if (!rasterTileInfo?.tile_url) return [];

  return [
    new TileLayer({
      id: `raster-overlay-${rasterTileInfo.kind}`,
      data: rasterTileInfo.tile_url,
      minZoom: 0,
      maxZoom: 19,
      tileSize: 256,
      opacity: 0.92,
      renderSubLayers: (props) => {
        const { boundingBox } = props.tile;
        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          bounds: [
            boundingBox[0][0], boundingBox[0][1],
            boundingBox[1][0], boundingBox[1][1],
          ],
        });
      },
    }),
  ];
};
