/** Cihaz tipine göre basit bir "görüntü" yer tutucusu (mock görüntüleme paneli). */
export default function ScanThumbnail({ type, size = 110 }) {
  return (
    <div style={{
      width: size, height: size, flex: 'none', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
      background: 'radial-gradient(circle at 50% 45%, #2a2f45 0%, #0c0e17 80%)', position: 'relative',
      border: '1px solid var(--color-divider)'
    }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
        <ellipse cx="50" cy="52" rx="30" ry="36" fill="none" stroke="#5b6b9c" strokeWidth="1.5" opacity="0.7" />
        <ellipse cx="50" cy="52" rx="20" ry="24" fill="none" stroke="#7f93cc" strokeWidth="1" opacity="0.6" />
        <circle cx="50" cy="48" r="7" fill="#9fb2e8" opacity="0.65" />
        <line x1="10" y1="52" x2="90" y2="52" stroke="#2b3050" strokeWidth="0.6" />
        <line x1="50" y1="10" x2="50" y2="94" stroke="#2b3050" strokeWidth="0.6" />
      </svg>
      <span style={{ position: 'absolute', bottom: 3, left: 5, fontSize: 8, color: '#9fb2e8', letterSpacing: '.05em' }}>{type}</span>
      <i className="ph ph-crosshair" style={{ position: 'absolute', top: 4, right: 4, fontSize: 11, color: '#6d7fb5' }} />
    </div>
  );
}
