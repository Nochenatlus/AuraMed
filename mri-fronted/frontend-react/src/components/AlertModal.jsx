export default function AlertModal({ alert, onDismiss }) {
  if (!alert) return null;
  return (
    <div className="dialog-backdrop" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div className="dialog" style={{ width: 'min(400px, 100%)', animation: 'modalIn .18s ease-out', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', backgroundColor: '#992B2B' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <i className="ph ph-siren" style={{ fontSize: 26, color: '#F3F5FE', animation: 'pulseGlow 1.2s ease-in-out infinite' }} />
          <div className="dialog-title" style={{ margin: 0, color: '#F3F5FE' }}><b>Eşik Aşımı Bildirimi</b></div>
        </div>
        <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', fontSize: 13, color: '#F3F5FE' }}>
          <div><strong>{alert.deviceName}</strong> — {alert.paramLabel}</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24 }}>{alert.valueStr}</div>
          <div>Eşik: {alert.thresholdStr}</div>
          <div>Saat: {alert.timeStr}</div>
        </div>
        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onDismiss} style={{ color: 'var(--color-bg)', backgroundColor: 'var(--color-neutral-100)' }}>Anladım</button>
        </div>
      </div>
    </div>
  );
}

