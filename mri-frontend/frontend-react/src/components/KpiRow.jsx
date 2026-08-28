export default function KpiRow({ kpis }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)' }}>
      {kpis.map((k) => (
        <div key={k.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--color-accent) 14%, transparent)', flex: 'none' }}>
            <i className={k.icon} style={{ fontSize: 19, color: 'var(--color-text)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 22, lineHeight: 1.1, color: k.valueColor || 'var(--color-text)' }}>{k.value}</span>
            <span style={{ fontSize: 11, color: 'var(--color-neutral-400)' }}>{k.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
} 