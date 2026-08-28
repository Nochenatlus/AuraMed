import { DEVICES, PARAM_DEFS } from '../lib/constants.js';
import { fmt } from '../lib/format.js';

export default function DevicesTable({ values, alerts, occupancy, onSelect }) {
  return (
    <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-6)' }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)', overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Cihaz</th><th>Tip</th><th>Konum</th><th>Oda</th><th>Sıcaklık</th><th>Nem</th><th>Radyasyon</th><th>Durum</th></tr></thead>
          <tbody>
            {DEVICES.map((d) => {
              const alert = PARAM_DEFS.some((p) => alerts[d.id][p.key]);
              return (
                <tr key={d.id} onClick={() => onSelect(d.id)} style={{ cursor: 'pointer' }}>
                  <td><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i className={d.icon} style={{ color: 'var(--color-text)' }} />{d.name}</span></td>
                  <td>{d.type}</td>
                  <td style={{ color: 'var(--color-neutral-400)' }}>{d.location}</td>
                  <td>{occupancy[d.id] ? 'Dolu' : 'Boş'}</td>
                  {PARAM_DEFS.map((p) => (
                    <td key={p.key} style={{ color: alerts[d.id][p.key] ? 'var(--color-accent-300)' : 'var(--color-text)' }}>
                      {fmt(p, values[d.id][p.key])} {p.unit}
                    </td>
                  ))}
                  <td><span className={'tag ' + (alert ? 'tag-accent' : 'tag-neutral')}>{alert ? 'Uyarı' : 'Normal'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 