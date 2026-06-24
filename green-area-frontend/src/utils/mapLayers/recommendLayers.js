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
        // ใหญ่ขึ้นเล็กน้อยให้เลขลำดับ (รวม "10") พอดีวงและอ่านออก
        getRadius: 90,
        radiusMinPixels: 11,
        radiusMaxPixels: 16,
        getFillColor: [220, 38, 38, 235],
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
        getSize: 14,
        sizeUnits: 'pixels',
        getColor: [255, 255, 255, 255],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        fontWeight: 700,
        // SDF + ขอบเข้ม → เลขขาวคมชัดบนวงแดง/พื้นหลัง heatmap (เดิมไม่มีขอบ เลยจม)
        fontSettings: { sdf: true, radius: 12, cutoff: 0.25 },
        outlineWidth: 2,
        outlineColor: [127, 29, 29, 255],
        characterSet: '0123456789',
        // วาดทับ scatterplot เสมอ ไม่ถูก depth ของหมุดบัง
        parameters: { depthTest: false },
      }),
    );
  }

  return layers;
};
