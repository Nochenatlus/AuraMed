import { fmt } from '../lib/format.js';

const W = 600, H = 190;

export default function MainChart({ param, series, tickMs }) {
  const h = series.length ? series : [param.min];
  const scaleMin = Math.min(param.min, ...h) - param.step * 2;
  const scaleMax = Math.max(param.threshold * 1.12, ...h);
  const range = (scaleMax - scaleMin) || 1;
  const y = (v) => H - ((v - scaleMin) / range) * H;
  const stepX = W / ((h.length - 1) || 1);
  const pts = h.map((v, i) => (i * stepX).toFixed(1) + ',' + y(v).toFixed(1));
  const last = h[h.length - 1];
  const isAlert = last > param.threshold;
  const lineColor = isAlert ? '#ef4444' : 'var(--color-accent)';
  const stats = [
    { label: 'En düşük', value: fmt(param, Math.min(...h)) },
    { label: 'En yüksek', value: fmt(param, Math.max(...h)) },
    { label: 'Ortalama', value: fmt(param, h.reduce((a, b) => a + b, 0) / h.length) }
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-6) var(--space-8)',
      border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)',
      boxShadow: isAlert ? 'inset 0 0 0 1px #ef4444, inset 0 0 22px color-mix(in srgb, #ef4444 18%, transparent)' : 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 40, lineHeight: 1, color: isAlert ? '#ef4444' : 'var(--color-text)' }}>{fmt(param, last)}</span>
          <span style={{ fontSize: 14, color: 'var(--color-neutral-400)' }}>{param.unit}</span>
          <span className={'tag ' + (isAlert ? 'tag-danger' : 'tag-neutral')} style={{ marginLeft: 'var(--space-2)' }}>{isAlert ? 'Eşik Aşıldı' : 'Normal'}</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 10, color: 'var(--color-neutral-500)' }}>{s.label}</span>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-heading)' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={'areaFill-' + param.key} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.34" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((ftn) => (
          <line key={ftn} x1="0" y1={H * ftn} x2={W} y2={H * ftn} stroke="var(--color-neutral-800)" strokeWidth="1" />
        ))}
        <line x1="0" y1={y(param.threshold)} x2={W} y2={y(param.threshold)} stroke={isAlert ? '#ef4444' : 'var(--color-accent-400)'} strokeWidth="1" strokeDasharray="4,4" />
        <polygon points={'0,' + H + ' ' + pts.join(' ') + ' ' + W + ',' + H} fill={'url(#areaFill-' + param.key + ')'} />
        <polyline points={pts.join(' ')} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={W} cy={y(last)} r="4" fill={lineColor} />
        <circle cx={W} cy={y(last)} r="9" fill="none" stroke={lineColor} strokeWidth="1" opacity="0.5" style={{ animation: 'pulseGlow 1.6s ease-in-out infinite' }} />
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-neutral-500)' }}>
        <span>-{Math.round((h.length * tickMs) / 60000)} dk</span>
        <span style={{ color: isAlert ? '#ef4444' : 'var(--color-accent-300)' }}>Eşik: {fmt(param, param.threshold)} {param.unit}</span>
        <span>şimdi</span>
      </div>
    </div>
  );
}