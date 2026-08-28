export default function AlertModal({ alert, onDismiss }) {
  if (!alert) return null;
  return (
    <div className="dialog-backdrop" style={{ zIndex: 60 }} onClick={onDismiss}>
      <div
        className="dialog"
        style={{ animation: 'modalIn .18s ease-out', position: 'relative', alignItems: 'center', textAlign: 'center', paddingTop: 'var(--space-5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn btn-ghost btn-icon"
          onClick={onDismiss}
          aria-label="Kapat"
          style={{ position: 'absolute', top: 8, right: 8 }}
        >
          <i className="ph ph-x" />
        </button>

        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'color-mix(in srgb, #ef4444 14%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none'
        }}>
          <i className="ph-bold ph-siren" style={{ fontSize: 28, color: '#dc2626', animation: 'pulseGlow 1.2s ease-in-out infinite' }} />
        </div>

        <div className="dialog-title">Eşik Aşımı Bildirimi</div>

        <div className="dialog-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div><strong>{alert.deviceName}</strong> — {alert.paramLabel}</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, color: '#dc2626' }}>{alert.valueStr}</div>
          <div style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>Eşik: {alert.thresholdStr} · Saat: {alert.timeStr}</div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onDismiss}>
          <i className="ph ph-check" />Anladım
        </button>
      </div>
    </div>
  );
}
