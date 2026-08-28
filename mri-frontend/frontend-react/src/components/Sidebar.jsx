import { useState } from 'react';
import { viewsForRole } from '../lib/constants.js';
import { fmtTime } from '../lib/format.js';

const boldIcon = (cls) => cls.replace(/^ph ph-/, 'ph-bold ph-');
const initials = (t) => ((t.name?.[0] || '') + (t.surname?.[0] || '')).toUpperCase();

function Avatar({ technician, size }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flex: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-accent)', color: '#ffffff',
      fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: size * 0.4
    }}>
      {initials(technician)}
    </div>
  );
}

function Tip({ label, collapsed, children }) {
  if (!collapsed) return children;
  return (
    <div className="tip-wrap" style={{ width: '100%' }} tabIndex={-1}>
      {children}
      <span className="tip-bubble">{label}</span>
    </div>
  );
}

export default function Sidebar({
  view, onView, alertCount, tickMs, eventCount, connection,
  collapsed: collapsedProp, onToggleCollapse,
  mobileOpen, onCloseMobile,
  technician, shiftStart, onLogout,
  theme, onSetTheme
}) {

  const collapsed = mobileOpen ? false : collapsedProp;
  const [profileOpen, setProfileOpen] = useState(false);
  const views = viewsForRole(technician.role);
  const CONN = { canli: 'Demo akış', baglaniyor: 'Bağlanıyor…', kopuk: 'Yoklama modu', demo: 'Demo akış' };

  const handleView = (id) => { onView(id); onCloseMobile(); };

  // Biyomedikal Destek'i ana listeden ayırıp alt boşlukta (Demo akış kartının hemen üstünde) gösteriyoruz.
  const topViews = views.filter((v) => v.id !== 'biomedical');
  const biomedicalView = views.find((v) => v.id === 'biomedical');

  const renderNavItem = (v) => {
    const active = v.id === view;
    return (
      <Tip key={v.id} label={v.label} collapsed={collapsed}>
        <div
          onClick={() => handleView(v.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            background: active ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
            borderLeft: collapsed ? 'none' : '2px solid ' + (active ? '#fff' : 'transparent'),
            position: 'relative',
            transition: 'background .15s ease'
          }}
        >
          <i className={boldIcon(v.icon)} style={{ fontSize: 17, flex: 'none' }} />
          {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{v.label}</span>}
          {!collapsed && <span style={{ flex: 1 }} />}
          {v.id === 'panel' && alertCount > 0 && (
            collapsed ? (
              <span style={{ position: 'absolute', top: 4, right: 10, width: 7, height: 7, borderRadius: '50%', background: 'var(--color-accent)' }} />
            ) : (
              <span className="tag tag-accent" style={{ fontSize: 10, padding: '1px 6px' }}>{alertCount}</span>
            )
          )}
        </div>
      </Tip>
    );
  };

  return (
    <div className={'sidebar-root' + (mobileOpen ? ' sidebar-open' : '')} style={{
      width: collapsed ? 72 : 240, minWidth: collapsed ? 72 : 240, flex: 'none', transition: 'width .18s ease, min-width .18s ease',
      borderRight: '1px solid var(--color-divider)',
      background: 'var(--color-sidebar)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-4) var(--space-3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 'var(--space-2)', padding: '0 var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', overflow: 'hidden' }}>
          <i className="ph-bold ph-activity" style={{ fontSize: 22, color: '#fff', flex: 'none' }} />
          {!collapsed && <span style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>AuraMed</span>}
        </div>
        {!collapsed && (
          <button className="btn btn-ghost btn-icon" onClick={onToggleCollapse} aria-label="Menüyü daralt (Ctrl/Cmd+B)" title="Menüyü daralt (Ctrl/Cmd+B)">
            <i className="ph ph-caret-left" />
          </button>
        )}
        <button className="btn btn-ghost btn-icon sidebar-mobile-close" onClick={onCloseMobile} aria-label="Menüyü kapat" style={{ marginLeft: 'auto' }}>
          <i className="ph ph-x" />
        </button>
      </div>

      {collapsed && (
        <button className="btn btn-ghost btn-icon" onClick={onToggleCollapse} aria-label="Menüyü genişlet (Ctrl/Cmd+B)" title="Menüyü genişlet (Ctrl/Cmd+B)" style={{ alignSelf: 'center' }}>
          <i className="ph ph-caret-right" />
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {topViews.map((v) => renderNavItem(v))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Biyomedikal Destek — alt boşlukta, Demo akış kartının hemen üstünde. */}
      {biomedicalView && (
        <div style={{ marginBottom: 'var(--space-2)' }}>
          {renderNavItem(biomedicalView)}
        </div>
      )}

      {/* Sensör akış durumu — yalnızca teknisyen için (doktor ekranında gizli). */}
      {technician.role !== 'doctor' && (
        <Tip label={CONN[connection]} collapsed={collapsed}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-3)', alignItems: collapsed ? 'center' : 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 12, fontWeight: 700, color: 'var(--color-text)', justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <i className="ph-bold ph-pulse" style={{ fontSize: 16, color: 'var(--color-text)', animation: 'pulseGlow 1.8s ease-in-out infinite', flex: 'none' }} />
              {!collapsed && CONN[connection]}
            </div>
            {!collapsed && (
              <>
                <div style={{ fontSize: 11, color: 'var(--color-neutral-400)' }}>Örnekleme {(tickMs / 1000).toFixed(1)} sn</div>
                <div style={{ fontSize: 11, color: 'var(--color-neutral-400)' }}>Toplam kayıt: {eventCount}</div>
              </>
            )}
          </div>
        </Tip>
      )}

      <div style={{ position: 'relative' }}>
        <Tip label={technician.name + ' ' + technician.surname} collapsed={collapsed}>
          <div
            onClick={() => setProfileOpen((o) => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)',
              borderTop: '1px solid rgba(255, 255, 255, 0.25)', paddingTop: 'var(--space-3)'
            }}
          >
            <Avatar technician={technician} size={28} />
            {!collapsed && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{technician.name} {technician.surname}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.75)' }}>SİCİL: {technician.sicil}</span>
                </div>
                <span style={{ flex: 1 }} />
                <i className="ph-bold ph-caret-up" style={{ fontSize: 12, color: '#fff', flex: 'none' }} />
              </>
            )}
          </div>
        </Tip>

        {profileOpen && (
          <div className="card elev-md" style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, width: 220,
            padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', zIndex: 40
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Avatar technician={technician} size={38} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{technician.name} {technician.surname}</span>
                <span style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>SİCİL: {technician.sicil}</span>
              </div>
            </div>
            <div className="hr" style={{ margin: 'var(--space-1) 0' }} />
            <div style={{ fontSize: 11, color: 'var(--color-neutral-400)' }}>
              Vardiya başlangıcı: {shiftStart ? fmtTime(new Date(shiftStart)) : '—'}
            </div>
            <div className="hr" style={{ margin: 'var(--space-1) 0' }} />
            <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-neutral-500)' }}>Tema</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[{ id: 'light', label: 'Açık', icon: 'ph-bold ph-sun' }, { id: 'dark', label: 'Koyu', icon: 'ph-bold ph-moon' }].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => onSetTheme(opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer',
                    padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius-sm)', fontSize: 13
                  }}
                >
                  <i className={opt.icon} style={{ fontSize: 15, color: 'var(--color-text)', flex: 'none' }} />
                  <span style={{ color: 'var(--color-text)' }}>{opt.label}</span>
                  <span style={{ flex: 1 }} />
                  {theme === opt.id && <i className="ph-bold ph-check" style={{ fontSize: 14, color: 'var(--color-accent)', flex: 'none' }} />}
                </div>
              ))}
            </div>
            <div className="hr" />
            <button className="btn btn-ghost btn-block" onClick={onLogout}><i className="ph ph-sign-out" />Çıkış Yap</button>
          </div>
        )}
      </div>
    </div>
  );
}
