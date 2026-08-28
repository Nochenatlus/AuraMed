import { DEVICE_TYPES, DEVICE_BY_ID, paramsForType, deviceIcon } from '../lib/constants.js';
import { fmt } from '../lib/format.js';

export default function ThresholdsView({ events }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {DEVICE_TYPES.map((type, i) => (
        <div
          key={type}
          style={{
            display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
            paddingTop: i > 0 ? 'var(--space-5)' : 0,
            borderTop: i > 0 ? '1px solid var(--color-divider)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <i className={deviceIcon(type)} style={{ fontSize: 16, color: 'var(--color-accent)' }} />
            <h6 style={{ margin: 0, color: 'var(--color-neutral-400)' }}>{type}</h6>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', alignItems: 'start' }}>
            {paramsForType(type).map((p) => (
              <div
                key={p.key}
                className="card"
                style={{
                  display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
                  padding: 'var(--space-4)', border: '1px solid var(--color-divider)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <i className={p.icon} style={{ fontSize: 20, color: 'var(--color-text)' }} />
                  <span className="card-title">{p.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 30 }}>{fmt(p, p.threshold)}</span>
                  <span style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>{p.unit}</span>
                </div>
                <div style={{ height: 1, background: 'var(--color-divider)', margin: 'var(--space-1) 0' }} />
                <div className="card-meta">Normal aralık: {fmt(p, p.min)} – {fmt(p, p.max)} {p.unit}</div>
                <div className="card-meta">
                  Son 30 günde aşım: {events.filter((e) => e.param === p.key && DEVICE_BY_ID[e.deviceId]?.type === type).length} kayıt
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
