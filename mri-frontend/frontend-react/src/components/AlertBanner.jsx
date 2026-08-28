export default function AlertBanner({ items, technicianName }) {
  if (!items.length) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-4)', margin: 'var(--space-4) var(--space-5) 0',
      background: 'color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))',
      border: '1px solid var(--color-accent)', borderRadius: 8,
      boxShadow: '0 0 24px color-mix(in srgb, var(--color-accent) 26%, transparent)'
    }}>
      <i className="ph ph-siren" style={{ fontSize: 22, color: 'var(--color-accent-300)', animation: 'pulseGlow 1.4s ease-in-out infinite', flex: 'none' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14 }}>Eşik aşımı tespit edildi</div>
        <div style={{ fontSize: 12, color: 'var(--color-neutral-300)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2) var(--space-4)' }}>
          {items.map((a) => <span key={a.id}>{a.text}</span>)}
        </div>
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-neutral-400)', flex: 'none' }}>Sorumlu: {technicianName}</span>
    </div>
  );
}
