import DrawToolbar from './draw/DrawToolbar';
import DrawResultCard from './draw/DrawResultCard';

// Floating panel สำหรับ "วาดพื้นที่วิเคราะห์เอง" — สลับระหว่างโหมดวาด (DrawToolbar)
// กับการ์ดผลลัพธ์ (DrawResultCard) · วางลอยกลาง-บนของแผนที่
export default function DrawControl({ draw, year, resolveProvince, onSave, saving }) {
  const {
    drawActive, points, result, loading, area,
    analyze, undoPoint, cancelDraw, startDraw, reset,
    recommendResult, recommendLoading, recommendVisible,
    recommendArea, toggleRecommendVisible,
  } = draw;

  if (!drawActive && !result) return null;

  return (
    <div className="draw-panel" role="region" aria-label="วาดพื้นที่วิเคราะห์เอง">
      {drawActive ? (
        <DrawToolbar
          points={points}
          area={area}
          loading={loading}
          onUndo={undoPoint}
          onAnalyze={() => analyze(year)}
          onCancel={cancelDraw}
        />
      ) : (
        <DrawResultCard
          result={result}
          recommendResult={recommendResult}
          recommendLoading={recommendLoading}
          recommendVisible={recommendVisible}
          onRecommend={() => recommendArea(result.year, resolveProvince?.(points))}
          onToggleRecommendVisible={toggleRecommendVisible}
          onStartDraw={startDraw}
          onClose={reset}
          onSave={onSave}
          saving={saving}
        />
      )}
    </div>
  );
}
