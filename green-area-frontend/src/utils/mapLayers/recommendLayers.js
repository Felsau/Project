// Planting-recommendation overlays — score heatmap tiles + top-N marker points.
import { BitmapLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';

export const recommendLayers = (ctx) => {
  const { recommendData, recommendVisible, setTooltip } = ctx;
  if (!recommendData || !recommendVisible) return [];

  const layers = [];

  if (recommendData.tile_url) {
    layers.push(new TileLayer({
      id: 'recommend-heatmap',
      data: recommendData.tile_url,
      minZoom: 0,
      maxZoom: 19,
      tileSize: 256,
      opacity: 0.65,
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
    }));
  }

  if (recommendData.top_locations?.length) {
    layers.push(
      new ScatterplotLayer({
        id: 'recommend-top-points',
        data: recommendData.top_locations,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: 80,
        radiusMinPixels: 8,
        radiusMaxPixels: 14,
        getFillColor: [220, 38, 38, 230],
        getLineColor: [255, 255, 255, 255],
        lineWidthMinPixels: 2,
        stroked: true,
        pickable: true,
        onHover: ({ object, index, x, y }) => {
          setTooltip(object ? {
            x, y,
            nameTH: `จุดแนะนำปลูก #${index + 1}`,
            nameEN: `score ${object.score} · ${object.lat}, ${object.lng}`,
          } : null);
        },
      }),
      new TextLayer({
        id: 'recommend-top-labels',
        data: recommendData.top_locations,
        getPosition: (d) => [d.lng, d.lat],
        getText: (d, { index }) => String(index + 1),
        getSize: 12,
        getColor: [255, 255, 255, 255],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        fontWeight: 'bold',
      }),
    );
  }

  return layers;
};
