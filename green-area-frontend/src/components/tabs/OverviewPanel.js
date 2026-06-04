import { PROVINCE_TH, AVAILABLE_YEARS } from '../../constants';
import { exportRankingCsv } from '../../utils/exportUtils';
import { buildRankingReport } from '../../utils/reportPdf';
import ExportBar from '../ui/ExportBar';
import { Note } from '../ui/Metric';

export default function OverviewPanel({ data, handlers }) {
  const {
    rankingData = [], rankingStats = null, rankingLoading = false, rankingYear,
    ndviCache,
  } = data;
  const { onFetchRanking, setRankingYear } = handlers;

  const cacheCount = Object.keys(ndviCache || {}).length;
  const passPct = rankingStats?.total > 0
    ? Math.round((rankingStats.whoPass / rankingStats.total) * 100)
    : 0;

  return (
    <div id="export-ranking" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <section className="section">
        <div className="section__head">
          <span className="section__title">โหลดอันดับรายปี</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <select
            className="field"
            style={{ width: 100 }}
            value={rankingYear}
            onChange={e => setRankingYear(Number(e.target.value))}
          >
            {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            className="btn btn--primary"
            style={{ flex: 1 }}
            onClick={() => onFetchRanking(rankingYear)}
            disabled={rankingLoading}
          >
            {rankingLoading ? 'กำลังโหลด…' : 'โหลดอันดับ'}
          </button>
        </div>
        {cacheCount > 0 && (
          <div className="helper">{cacheCount} จังหวัดอยู่ในแคชแล้ว · แสดงเป็น 3D บนแผนที่</div>
        )}
      </section>

      {rankingStats && (
        <>
          <section className="section">
            <div className="section__head">
              <span className="section__title">สรุปปี {rankingYear}</span>
              <span className="section__meta">{rankingStats.total} จังหวัด</span>
            </div>
            <div className="kv-row">
              <div className="kv">
                <div className="kv__label">ผ่าน WHO</div>
                <div className="kv__value">{rankingStats.whoPass}</div>
                <div className="kv__hint">{passPct}% ของทั้งหมด</div>
              </div>
              <div className="kv">
                <div className="kv__label">ต่ำกว่า WHO</div>
                <div className="kv__value">{rankingStats.whoFail}</div>
                <div className="kv__hint">{100 - passPct}% ของทั้งหมด</div>
              </div>
            </div>
            <div className="bar" style={{ marginTop: 4 }}>
              <div className="bar__fill" style={{ width: `${passPct}%` }} />
            </div>
          </section>

          {rankingData.length > 0 && (
            <section className="section">
              <div className="section__head">
                <span className="section__title">ห้าจังหวัดที่ขาดแคลนพื้นที่สีเขียวที่สุด</span>
              </div>
              <div className="rank-table">
                {rankingData.slice(0, 5).map(r => (
                  <div className="rank-row" key={r.province}>
                    <span className="rank-row__num">{String(r.rank).padStart(2, '0')}</span>
                    <span className="rank-row__name">{PROVINCE_TH[r.province] || r.province}</span>
                    <span className="rank-row__val">{r.green_area_m2_per_person?.toFixed(1) ?? '—'} m²</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {rankingData.length > 0 && (
            <section className="section">
              <div className="section__head">
                <span className="section__title">ห้าจังหวัดที่มีพื้นที่สีเขียวมากที่สุด</span>
              </div>
              <div className="rank-table">
                {[...rankingData].reverse().slice(0, 5).map(r => (
                  <div className="rank-row" key={r.province}>
                    <span className="rank-row__num">{String(r.rank).padStart(2, '0')}</span>
                    <span className="rank-row__name">{PROVINCE_TH[r.province] || r.province}</span>
                    <span className="rank-row__val">{r.green_area_m2_per_person?.toFixed(1) ?? '—'} m²</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!rankingStats && (
        <Note label="วิธีใช้งาน">
          คลิกจังหวัดบนแผนที่ <strong>เพื่อดูข้อมูลเชิงลึก</strong> หรือ
          กด <strong>โหลดอันดับ</strong> เพื่อจัดอันดับทั้งประเทศตามพื้นที่สีเขียวต่อคน
        </Note>
      )}

      {rankingStats && (
        <ExportBar
          targetId="export-ranking"
          baseName={`ranking_${rankingYear}`}
          onCsv={() => exportRankingCsv({ rankingData, rankingYear, rankingStats })}
          onPdf={() => buildRankingReport({ rankingData, rankingYear, rankingStats })}
        />
      )}
    </div>
  );
}
