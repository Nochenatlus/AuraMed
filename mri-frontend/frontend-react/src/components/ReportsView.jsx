import { useState } from 'react';
import { DEVICES } from '../lib/constants.js';
import DateField from './DateField.jsx';

export default function ReportsView({ filters, setFilters, rows, onExport, exporting }) {
  const [showRangeWarning, setShowRangeWarning] = useState(false);
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const setStart = (start) => setFilters((f) => ({ ...f, start }));
  const setEnd = (end) => setFilters((f) => ({ ...f, end }));

  const handleExportClick = () => {
    if (!filters.start || !filters.end) { setShowRangeWarning(true); return; }
    onExport();
  };

  return (
    <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 'var(--space-3)' }}>
        <div className="field" style={{ width: 190 }}>
          <label>Cihaz</label>
          <select className="input" value={filters.deviceId} onChange={set('deviceId')}>
            <option value="all">Tüm Cihazlar</option>
            {DEVICES.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <DateField label="Başlangıç Tarihi" value={filters.start} onChange={setStart} />
        <DateField label="Bitiş Tarihi" value={filters.end} onChange={setEnd} />
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={handleExportClick} disabled={exporting}>
          <i className="ph ph-file-pdf" />{exporting ? 'Hazırlanıyor…' : 'PDF olarak indir'}
        </button>
      </div>

      {showRangeWarning && (
        <div className="dialog-backdrop" style={{ zIndex: 60 }}>
          <div className="dialog" style={{ animation: 'modalIn .18s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <i className="ph ph-warning-circle" style={{ fontSize: 24, color: 'var(--color-text)' }} />
              <div className="dialog-title">Tarih aralığı seçin</div>
            </div>
            <div className="dialog-body">Rapor oluşturmadan önce bir başlangıç ve bitiş tarihi seçmelisiniz.</div>
            <div className="dialog-actions">
              <button className="btn btn-primary" onClick={() => setShowRangeWarning(false)}>Tamam</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)' }}>
        <table className="table">
          <thead><tr><th>Tarih / Saat</th><th>Cihaz</th><th>Parametre</th><th>Değer</th><th>Eşik</th></tr></thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td>{e.timeStr}</td>
                <td>{e.deviceName}</td>
                <td><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i className={e.icon} style={{ color: 'var(--color-neutral-400)' }} />{e.paramLabel}</span></td>
                <td style={{ color: 'var(--color-accent-300)' }}>{e.valueStr}</td>
                <td style={{ color: 'var(--color-neutral-400)' }}>{e.thresholdStr}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
            <i className="ph ph-clipboard-text" style={{ fontSize: 28 }} />Seçilen aralıkta eşik aşımı kaydı bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}
