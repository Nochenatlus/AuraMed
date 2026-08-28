import { paramsForDevice } from '../lib/constants.js';

const SPARK_W = 100, SPARK_H = 60;

/** Ham veriyi hareketli ortalamayla yumuşatır — küçük ölçme gürültüsü abartılı zikzak yerine sakin bir dalga gibi görünür. */
function smooth(series, window) {
  return series.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = series.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

/** Noktalar arasından geçen yumuşak (quadratic) eğri — düz çizgi segmentleri yerine organik bir dalga çizer. */
function smoothPath(points) {
  if (points.length < 3) return 'M' + points.map((p) => p.join(',')).join(' L');
  let d = 'M' + points[0].join(',');
  for (let i = 1; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    d += ' Q' + x1 + ',' + y1 + ' ' + ((x1 + x2) / 2).toFixed(1) + ',' + ((y1 + y2) / 2).toFixed(1);
  }
  d += ' L' + points[points.length - 1].join(',');
  return d;
}

function Sparkline({ param, series }) {
  const raw = series && series.length ? series : [param.min];
  const h = smooth(raw, 4);
  const scaleMin = Math.min(...h), scaleMax = Math.max(...h);
  const pad = (scaleMax - scaleMin) * 0.25 || param.step;
  const lo = scaleMin - pad, hi = scaleMax + pad;
  const range = (hi - lo) || 1;
  const y = (v) => SPARK_H - ((v - lo) / range) * SPARK_H;
  const stepX = SPARK_W / ((h.length - 1) || 1);
  const points = h.map((v, i) => [Number((i * stepX).toFixed(1)), Number(y(v).toFixed(1))]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1, minWidth: 0, height: '100%' }}>
      <i className={param.icon} style={{ fontSize: 10, color: '#000', flex: 'none' }} />
      <svg viewBox={'0 0 ' + SPARK_W + ' ' + SPARK_H} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block', flex: 1 }}>
        <path d={smoothPath(points)} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function DeviceCard({ device, history, alerts, occupied, onSelect }) {
  const params = paramsForDevice(device.id);
  const alert = params.some((p) => alerts[p.key]);
  return (
    <div
      className="card"
      onClick={onSelect}
      style={{
        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
        background: alert
          ? 'color-mix(in srgb, #ef4444 9%, var(--color-surface))'
          : 'color-mix(in srgb, #22c55e 7%, var(--color-surface))',
        border: '3px solid ' + (alert ? '#ef4444' : 'color-mix(in srgb, #22c55e 35%, transparent)'),
        boxShadow: alert ? '0 0 0 1px #ef4444, 0 0 16px color-mix(in srgb, #ef4444 30%, transparent)' : 'var(--shadow-sm)',
        transition: 'transform .16s ease, box-shadow .16s ease, background .16s ease',
        padding: 'var(--space-6)',
        minHeight: '188px',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <i className={device.icon} style={{ fontSize: 20, color: 'var(--color-text)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
            <span className="card-title" style={{ margin: 0 }}>{device.name}</span>
            <span style={{ fontSize: 10, color: 'var(--color-neutral-500)' }}>{device.location}</span>
          </div>
        </div>
        <span className={'tag ' + (alert ? 'tag-danger' : 'tag-success')}>{alert ? 'Uyarı' : 'Normal'}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 11, color: occupied ? 'var(--color-accent-300)' : 'var(--color-neutral-400)' }}>
        <i className={occupied ? 'ph ph-user-focus' : 'ph ph-door-open'} style={{ fontSize: 14 }} />
        {occupied ? 'Oda dolu — hasta içeride' : 'Oda boş'}
      </div>

      <div style={{ height: 1, background: 'var(--color-divider)' }} />

      <div style={{
        width: '100%', height: 120, borderRadius: 'var(--radius-md)',
        background: '#f7f5f0', border: '1px solid var(--color-divider)',
        display: 'flex', alignItems: 'stretch', gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-2)'
      }}>
        {params.map((p, i) => (
          <div key={p.key} style={{ display: 'flex', flex: 1, minWidth: 0, borderLeft: i > 0 ? '1px solid var(--color-divider)' : 'none', paddingLeft: i > 0 ? 'var(--space-4)' : 0 }}>
            <Sparkline param={p} series={history && history[p.key]} />
          </div>
        ))}
      </div>
    </div>
  );
}
