import { useState } from 'react';
import { exportElementPng, exportTabWithMapPng } from '../../utils/exportUtils';
import { pushError } from '../../utils/toast';

export default function ExportBar({ targetId, baseName, onCsv, onPdf, includeMap = true }) {
  const [busy, setBusy] = useState(null);

  const run = async (kind, fn) => {
    if (busy) return;
    setBusy(kind);
    try { await fn(); }
    catch (e) {
      console.error(e);
      pushError('ส่งออกไม่สำเร็จ: ' + (e?.message || e));
    } finally { setBusy(null); }
  };

  return (
    <div className="section">
      <div className="section__head section__head--quiet">
        <span className="section__title">ส่งออกข้อมูล</span>
      </div>
      <div className="export-bar">
        {onCsv && (
          <button className="export-btn" disabled={!!busy}
            onClick={() => run('csv', async () => onCsv())}>
            {busy === 'csv' ? '…' : 'CSV'}
          </button>
        )}
        <button className="export-btn" disabled={!!busy}
          onClick={() => run('png', () => exportElementPng(targetId, `${baseName}.png`))}>
          {busy === 'png' ? '…' : 'PNG'}
        </button>
        {onPdf && (
          <button className="export-btn" disabled={!!busy}
            onClick={() => run('pdf', () => onPdf())}>
            {busy === 'pdf' ? '…' : 'PDF'}
          </button>
        )}
        {includeMap && (
          <button className="export-btn" disabled={!!busy}
            onClick={() => run('map', () => exportTabWithMapPng(targetId, `${baseName}_with_map.png`))}>
            {busy === 'map' ? '…' : 'PNG + แผนที่'}
          </button>
        )}
      </div>
    </div>
  );
}
