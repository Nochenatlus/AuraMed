import { useState } from 'react';
import { useAppointments } from '../hooks/useAppointments.js';
import { api } from '../lib/api.js';
import ScanThumbnail from './ScanThumbnail.jsx';
import WorkflowStepper from './WorkflowStepper.jsx';
import StatusTag from './StatusTag.jsx';

const sectionCard = { border: '1px solid var(--color-divider)', padding: 'var(--space-4)', gap: 'var(--space-3)' };
const CONN_LABEL = { canli: 'Canlı', baglaniyor: 'Bağlanıyor…', kopuk: 'Yeniden bağlanıyor…', demo: 'Yoklama modu' };

const dmy = (ms) => new Date(ms).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const hhmm = (ms) => new Date(ms).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

/** Bir alan satırı — ikon + etiket + değer, okunabilirlik için. */
function Field({ icon, label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <i className={icon} style={{ fontSize: 15, color: 'var(--color-neutral-400)', width: 16, flex: 'none' }} />
      <span style={{ color: 'var(--color-neutral-500)', minWidth: 74 }}>{label}</span>
      <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{children}</span>
    </div>
  );
}

export default function DoctorEvaluationView({ onNavigate }) {
  const { appointments, connection, error: loadError, loading } = useAppointments(true, 'doctor');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  // Raporlaştırmaya geçiş için bekleyen onay (yanlışlıkla basmayı önleyen confirm modal).
  const [confirmAppt, setConfirmAppt] = useState(null);

  // Bu sayfa yalnızca değerlendirme aşamasındakileri gösterir (raporlama/onay ayrı sayfalarda).
  const pending = appointments.filter((a) => a.status === 'ImageCreated' || a.status === 'ImageEvaluation');

  const evaluate = async (id) => {
    setBusyId(id); setError('');
    try { await api.appointmentChangeStatus(id, 'ImageEvaluation'); }
    catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  const toReporting = async (id) => {
    setBusyId(id); setError('');
    try {
      await api.appointmentChangeStatus(id, 'Reporting');
      onNavigate?.('reporting'); // Raporlaştır → Raporlama sayfasına yönlendir
    } catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  // Onay verilince raporlaştırmaya geç; ana aksiyon yalnızca buradan tetiklenir.
  const confirmReporting = () => {
    const appt = confirmAppt;
    setConfirmAppt(null);
    if (appt) toReporting(appt.id);
  };

  return (
    <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="card" style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <i className="ph ph-magnifying-glass" style={{ fontSize: 20, color: 'var(--color-text)' }} />
          <span className="card-title">Görüntü Değerlendirme</span>
          <span style={{ flex: 1 }} />
          <span className="tag tag-neutral" style={{ gap: 5 }}><i className="ph ph-broadcast" />{CONN_LABEL[connection]}</span>
        </div>
        <div className="card-meta">
          Çekimi tamamlanıp "Görüntü Oluşturuldu" durumuna gelen istemler burada değerlendirilir.
          "Raporlaştır" ile istem Raporlama sayfasına aktarılır.
        </div>
        {error && <div style={{ fontSize: 12, color: '#b91c1c' }}><i className="ph ph-warning-circle" /> {error}</div>}
        {loadError && !error && <div style={{ fontSize: 12, color: '#b91c1c' }}><i className="ph ph-warning-circle" /> {loadError}</div>}
      </div>

      {pending.length === 0 ? (
        <div className="card" style={sectionCard}>
          <div style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
            <i className="ph ph-images" style={{ fontSize: 30 }} />
            {loading ? 'Yükleniyor…' : 'Değerlendirme bekleyen görüntü yok. Teknisyen bir çekimi tamamladığında burada anlık görünür.'}
          </div>
        </div>
      ) : (
        <div className="card" style={sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <i className="ph ph-images" style={{ fontSize: 18, color: 'var(--color-text)' }} />
            <span className="card-title">Değerlendirme Bekleyen Görüntüler</span>
            <span className="tag tag-accent-2" style={{ marginLeft: 4 }}>{pending.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {pending.map((a) => {
              const startMs = new Date(a.scheduledStart).getTime();
              const next = a.status === 'ImageCreated'
                ? { label: 'Değerlendirmeye Al', icon: 'ph ph-magnifying-glass', run: () => evaluate(a.id) }
                : { label: 'Raporlaştır', icon: 'ph ph-file-text', run: () => setConfirmAppt(a) }; // önce onay modalı
              return (
                <div key={a.id} className="card" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)', border: '1px solid var(--color-divider)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                    <ScanThumbnail type={a.deviceType} size={120} />

                    <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <i className="ph-fill ph-user-circle" style={{ fontSize: 22, color: 'var(--color-accent-300)' }} />
                        <span style={{ fontWeight: 700, fontSize: 16 }}>{a.patientName}</span>
                        {a.patientProtocolNo && <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>· {a.patientProtocolNo}</span>}
                        <span style={{ flex: 1 }} />
                        <StatusTag status={a.status} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Field icon="ph ph-device-mobile-camera" label="Cihaz">{a.deviceName} · {a.deviceType}</Field>
                        <Field icon="ph ph-clock" label="Tarih/Saat">{dmy(startMs)} · {hhmm(startMs)}</Field>
                        {a.notes && <Field icon="ph ph-note" label="İstem notu">{a.notes}</Field>}
                      </div>
                    </div>

                    <div style={{ flex: 'none', paddingLeft: 'var(--space-2)', borderLeft: '1px solid var(--color-divider)' }}>
                      <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-neutral-500)', marginBottom: 6 }}>Süreç</div>
                      <WorkflowStepper status={a.status} />
                    </div>
                  </div>

                  <div className="hr" />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" disabled={busyId === a.id} onClick={next.run}>
                      <i className={next.icon} />{next.label}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {confirmAppt && (
        <div className="dialog-backdrop" style={{ zIndex: 60 }} onClick={() => setConfirmAppt(null)}>
          <div
            className="dialog"
            style={{ animation: 'modalIn .18s ease-out', position: 'relative', alignItems: 'center', textAlign: 'center', paddingTop: 'var(--space-5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setConfirmAppt(null)}
              aria-label="Kapat"
              style={{ position: 'absolute', top: 8, right: 8 }}
            >
              <i className="ph ph-x" />
            </button>

            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'color-mix(in srgb, #266cdc 14%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none'
            }}>
              <i className="ph-bold ph-warning" style={{ fontSize: 28, color: '#266cdc' }} />
            </div>

            <div className="dialog-title">Raporlaştırma Adımı</div>

            <div className="dialog-body" style={{ textAlign: 'center' }}>
              Görüntü değerlendirmesini sonlandırıp resmi rapor ekranına geçmek üzeresiniz.<br></br>
              <div style={{ fontSize: 12, color: 'var(--color-neutral-500)', marginTop: 8 }}>
                {confirmAppt.patientName}{confirmAppt.patientProtocolNo ? ' · ' + confirmAppt.patientProtocolNo : ''} · {confirmAppt.deviceName}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', marginTop: 'var(--space-1)' }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmAppt(null)}>Vazgeç</button>
              <button className="btn" style={{ flex: 1, justifyContent: 'center', background: '#266cdc', borderColor: '#266cdc', color: '#fff' }} onClick={confirmReporting}>Onayla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
