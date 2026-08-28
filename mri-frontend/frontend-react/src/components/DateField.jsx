import { useEffect, useRef, useState } from 'react';
import { fmtDate } from '../lib/format.js';

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const pad = (n) => (n < 10 ? '0' + n : '' + n);

const toDate = (s) => (s ? new Date(s + 'T00:00:00') : null);
const fmtDisplay = (s) => {
  const d = toDate(s);
  return d ? pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() : '';
};

function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

/** Etiketli tek tarih alanı: kutu içinde DD.MM.YYYY + takvim ikonu, tıklanınca aylık takvim popover'ı açılır. */
export default function DateField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => toDate(value) || new Date());
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const cells = buildMonthGrid(viewMonth);
  const shiftMonth = (delta) => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const handleDayClick = (day) => {
    onChange(fmtDate(day));
    setOpen(false);
  };

  return (
    <div className="field" ref={rootRef} style={{ position: 'relative', width: 170 }}>
      <label>{label}</label>
      <button
        type="button"
        className="input"
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', font: 'inherit' }}
      >
        {value ? <span>{fmtDisplay(value)}</span> : <span style={{ color: 'var(--color-neutral-400)' }}>Tarih seçin</span>}
        <i className="ph ph-calendar" style={{ color: 'var(--color-neutral-400)' }} />
      </button>

      {open && (
        <div className="card elev-lg" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 40, width: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => shiftMonth(-1)} aria-label="Önceki ay">
              <i className="ph ph-caret-left" />
            </button>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 'var(--font-heading-weight)', fontSize: 13 }}>
              {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => shiftMonth(1)} aria-label="Sonraki ay">
              <i className="ph ph-caret-right" />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: 11, color: 'var(--color-neutral-400)', marginTop: 'var(--space-2)' }}>
            {WEEKDAYS.map((w) => <div key={w} style={{ textAlign: 'center' }}>{w}</div>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginTop: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const iso = fmtDate(day);
              const selected = iso === value;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  style={{
                    aspectRatio: '1', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    font: 'inherit', color: selected ? '#fff' : 'var(--color-text)',
                    background: selected ? 'var(--color-accent)' : 'transparent'
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
