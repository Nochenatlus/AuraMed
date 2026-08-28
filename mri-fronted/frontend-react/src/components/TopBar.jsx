export default function TopBar({ viewTitle, viewIcon, anyAlert, now, onOpenSidebar }) {
  return (
    <div className="nav" style={{
           background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-divider)',
          position: 'sticky',
          top: 0, zIndex: 30,
          justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 'var(--space-2)' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)' }}>
        <button className="btn btn-ghost btn-icon app-hamburger" onClick={onOpenSidebar} aria-label="Menüyü aç">
          <i className="ph ph-list" />
        </button>
        <i className={viewIcon} style={{ fontSize: 18, color: 'var(--color-text)' }} />
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 15 }}>{viewTitle}</span>
      </div>
      <div style={{ display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)' }}>
        <span className={'tag ' + (anyAlert ? 'tag-accent' : 'tag-neutral')}><i className="ph ph-heartbeat" /> {anyAlert ? 'Sistem: Uyarı' : 'Sistem: Normal'}</span>
        <span className="topbar-clock" style={{
           fontSize: 12,
           color: 'var(--color-neutral-400)',
           fontVariantNumeric: 'tabular-nums' }}>
          {new Date(now).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'medium' })}
        </span>
      </div>
    </div>
  );
}
