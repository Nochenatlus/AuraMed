import { useState } from 'react';

const FACTS = [
  { icon: 'ph ph-first-aid-kit', value: 'Görüntüleme Cihazları',      label: 'MRI, Röntgen, Ultrason, BT, PET-CT' },
  { icon: 'ph ph-waveform',      value: 'Parametreler',  label: 'sıcaklık · nem · doz' },
  { icon: 'ph ph-bell-ringing',  value: 'Anlık uyarılar',  label: 'eşik aşımında' }
];

const ecg = '0,45 60,45 78,45 88,18 98,62 110,45 150,45 168,45 178,30 188,52 200,45 260,45 278,45 288,12 300,66 312,45 380,45 398,45 408,26 418,58 430,45 460,45';

const ROLE_OPTS = [
  { id: 'technician', label: 'Teknisyen', icon: 'ph ph-wrench' },
  { id: 'doctor', label: 'Doktor', icon: 'ph ph-stethoscope' }
];

export default function Login({ onSubmit, error, busy }) {
  const [form, setForm] = useState({ name: '', surname: '', sicil: '', role: 'technician' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="login-root" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
      <div className="login-hero" style={{
        position: 'relative', overflow: 'hidden', padding: 'var(--space-8) var(--space-7)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        background: 'radial-gradient(120% 90% at 15% 10%, color-mix(in srgb, var(--color-accent) 16%, var(--color-bg)) 0%, var(--color-bg) 62%)',
        borderRight: '1px solid var(--color-divider)'
      }}>
        <i className="ph ph-circle-dashed" style={{ position: 'absolute', top: -60, right: -70, fontSize: 340, color: 'var(--color-neutral-700)', opacity: .28, animation: 'sweep 60s linear infinite' }} />
        <i className="ph ph-scan" style={{ position: 'absolute', bottom: '8%', left: -30, fontSize: 240, color: 'var(--color-neutral-700)', opacity: .2, animation: 'floatSlow 9s ease-in-out infinite' }} />
        <i className="ph ph-radioactive" style={{ position: 'absolute', bottom: '28%', right: '12%', fontSize: 130, color: 'var(--color-neutral-700)', opacity: .22, animation: 'floatSlow 11s ease-in-out infinite' }} />
        <i className="ph ph-dna" style={{ position: 'absolute', top: '42%', left: '8%', fontSize: 110, color: 'var(--color-neutral-700)', opacity: .18 }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <i className="ph ph-activity" style={{ fontSize: 65, color: 'var(--color-text)' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 25, letterSpacing: '.02em' }}><b>AuraMed</b></span>
          <span className="tag tag-outline" style={{ marginLeft: 'var(--space-2)' }}><b>Biyomedikal İzleme</b></span>
        </div>

        <div style={{ 
          position: 'relative',
          display: 'flex', 
          flexDirection: 'column',
          gap: 'var(--space-2)',
          maxWidth: '100%',
          width: '200%',
          margin: '0 auto',
          alignItems: 'center',  
          textAlign: 'center'}}>
          <h1 style={{ margin: 0, fontSize: 52, lineHeight: 1.1, fontWeight: 500,}}>
            Görüntüleme cihazlarınız<br />kesintisiz gözetim altında.
          </h1><br></br>
          <p style={{ margin: 0, color: 'var(--color-neutral-300)', fontSize: 18, lineHeight: 1.6, textWrap: 'pretty', maxWidth: 500 }}>
            Hassas tıbbi alanların sıcaklık, nem ve radyasyon dozu değerleri saniyeler içinde işlenir; eşik aşımında teknisyen anında uyarılır ve kayıt raporlanabilir hâle gelir.
          </p>
          <svg viewBox="0 0 460 70" width="1000%" height="200" style={{ overflow: 'visible', display: 'block', maxWidth: '100%' }}>
            <polyline points={ecg} fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinejoin="round" strokeDasharray="1400" style={{ animation: 'traceIn 4s linear infinite' }} />
          </svg> 
          <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap'}}>
            {FACTS.map((ft) => (
              <div key={ft.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}> <br></br>
                <i className={ft.icon} style={{ fontSize: 18, color: 'var(--color-accent-300)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>{ft.value}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-neutral-400)' }}>{ft.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', fontSize: 11, color: 'var(--color-neutral-500)' }}>Klinik Mühendislik Birimi · Sürüm 1.0</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)', position: 'relative', overflow: 'hidden' }}>
        <i className="ph ph-heartbeat" style={{ position: 'absolute', top: 40, right: -40, fontSize: 220, color: 'var(--color-neutral-700)', opacity: .16, animation: 'floatSlow 10s ease-in-out infinite' }} />
        <i className="ph ph-x-ray" style={{ position: 'absolute', bottom: 30, left: -20, fontSize: 180, color: 'var(--color-neutral-700)', opacity: .14 }} />
        <form
          className="card elev-md"
          onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
          style={{ width: 'min(400px, 100%)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-6)', animation: 'fadeUp .4s ease-out', position: 'relative', zIndex: 1 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <i className="ph ph-shield-check" style={{ fontSize: 20, color: 'var(--color-text)' }} />
            <span className="card-title">Personel Girişi</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-neutral-400)', marginBottom: 'var(--space-2)' }}>Rolünüzü seçin; vardiya kaydınız işlenir.</div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label><b>Rol</b></label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {ROLE_OPTS.map((r) => {
                const active = form.role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r.id }))}
                    className="btn"
                    style={{
                      flex: 1, justifyContent: 'center',
                      background: active ? 'var(--color-accent)' : 'transparent',
                      color: active ? '#fff' : 'var(--color-text)',
                      border: '1px solid ' + (active ? 'var(--color-accent)' : 'var(--color-divider)')
                    }}
                    aria-pressed={active}
                  >
                    <i className={r.icon} />{r.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field"><label><b>Ad</b></label><input className="input" value={form.name} onChange={set('name')} placeholder="Ad" /></div>
          <div className="field"><label><b>Soyad</b></label><input className="input" value={form.surname} onChange={set('surname')} placeholder="Soyad" /></div>
          <div className="field"><label><b>Sicil No</b></label><input className="input" value={form.sicil} onChange={set('sicil')} placeholder="Örn. 46M18*" /></div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 12, color: 'var(--color-accent-300)' }}>
              <i className="ph ph-warning-circle" />{error}
            </div>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: 'var(--space-2)' }}>
            <i className="ph ph-sign-in" />{busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 11, color: 'var(--color-neutral-500)' }}>
            <i className="ph ph-lock-key" />Oturum 8 saat sonra otomatik kapanır.
          </div>
        </form>
      </div>
    </div>
  );
}
