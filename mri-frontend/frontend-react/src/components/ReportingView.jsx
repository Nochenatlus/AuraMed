import { useState } from 'react';
import { useAppointments } from '../hooks/useAppointments.js';
import { api } from '../lib/api.js';
import ScanThumbnail from './ScanThumbnail.jsx';
import WorkflowStepper from './WorkflowStepper.jsx';

const sectionCard = { border: '1px solid var(--color-divider)', padding: 'var(--space-4)', gap: 'var(--space-3)' };
const CONN_LABEL = { canli: 'Canlı', baglaniyor: 'Bağlanıyor…', kopuk: 'Yeniden bağlanıyor…', demo: 'Yoklama modu' };

const dmy = (ms) => new Date(ms).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const hhmm = (ms) => new Date(ms).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

const reportKey = (id) => 'auramed_report_' + id;
export const loadReport = (id) => { try { return localStorage.getItem(reportKey(id)) || ''; } catch { return ''; } };
const saveReport = (id, text) => { try { localStorage.setItem(reportKey(id), text); } catch { /* yoksay */ } };

/** Cihaz tipine göre rapor taslağı şablonu. */
function template(a) {
  return `İnceleme: ${a.deviceType} — ${a.deviceName}\nHasta: ${a.patientName}${a.patientProtocolNo ? ' (' + a.patientProtocolNo + ')' : ''}\n\nKlinik bilgi: ${a.notes || '—'}\n\nBulgular:\n- \n\nSonuç:\n- `;
}

function ReportCard({ a, busyId, onApprove }) {
  const startMs = new Date(a.scheduledStart).getTime();
  const [text, setText] = useState(() => loadReport(a.id) || template(a));
  const [savedNote, setSavedNote] = useState('');

  const saveDraft = () => { saveReport(a.id, text); setSavedNote('Taslak kaydedildi.'); setTimeout(() => setSavedNote(''), 2000); };
  const approve = () => { saveReport(a.id, text); onApprove(a.id); };

  return (
    <div className="card" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)', border: '1px solid var(--color-divider)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <ScanThumbnail type={a.deviceType} size={120} />
        <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <i className="ph-fill ph-user-circle" style={{ fontSize: 22, color: 'var(--color-accent-300)' }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>{a.patientName}</span>
            {a.patientProtocolNo && <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>· {a.patientProtocolNo}</span>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-neutral-400)', display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <span><i className="ph ph-device-mobile-camera" /> {a.deviceName} · {a.deviceType}</span>
            <span><i className="ph ph-clock" /> {dmy(startMs)} · {hhmm(startMs)}</span>
          </div>
        </div>
        <div style={{ flex: 'none', paddingLeft: 'var(--space-2)', borderLeft: '1px solid var(--color-divider)' }}>
          <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-neutral-500)', marginBottom: 6 }}>Süreç</div>
          <WorkflowStepper status={a.status} />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <label>Rapor</label>
        <textarea className="input" rows={7} style={{ resize: 'vertical', fontFamily: 'inherit' }} value={text} onChange={(e) => setText(e.target.value)} />
      </div>

      <div className="hr" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {savedNote && <span style={{ fontSize: 12, color: 'var(--color-accent-300)' }}><i className="ph ph-check-circle" /> {savedNote}</span>}
        <span style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={saveDraft}><i className="ph ph-floppy-disk" />Taslağı Kaydet</button>
        <button className="btn btn-primary" disabled={busyId === a.id} onClick={approve}><i className="ph ph-seal-check" />Hekim Onayı Ver</button>
      </div>
    </div>
  );
}

export default function ReportingView() {
  const { appointments, connection, error: loadError, loading } = useAppointments(true, 'doctor');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const list = appointments.filter((a) => a.status === 'Reporting');

  const approve = async (id) => {
    setBusyId(id); setError('');
    try { await api.appointmentChangeStatus(id, 'Approved'); }
    catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  return (
    <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="card" style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <i className="ph ph-file-text" style={{ fontSize: 20, color: 'var(--color-text)' }} />
          <span className="card-title">Raporlama</span>
          <span style={{ flex: 1 }} />
          <span className="tag tag-neutral" style={{ gap: 5 }}><i className="ph ph-broadcast" />{CONN_LABEL[connection]}</span>
        </div>
        <div className="card-meta">Raporlaştırma aşamasındaki istemler. Raporu yazıp "Hekim Onayı Ver" ile süreci kapatın; onaylananlar "Onaylanmış Raporlar" sayfasında görünür.</div>
        {error && <div style={{ fontSize: 12, color: '#b91c1c' }}><i className="ph ph-warning-circle" /> {error}</div>}
        {loadError && !error && <div style={{ fontSize: 12, color: '#b91c1c' }}><i className="ph ph-warning-circle" /> {loadError}</div>}
      </div>

      {list.length === 0 ? (
        <div className="card" style={sectionCard}>
          <div style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
            <i className="ph ph-file-dashed" style={{ fontSize: 30 }} />
            {loading ? 'Yükleniyor…' : 'Raporlanacak istem yok. Görüntü Değerlendirme sayfasında "Raporlaştır" dediğinizde buraya düşer.'}
          </div>
        </div>
      ) : (
        list.map((a) => <ReportCard key={a.id} a={a} busyId={busyId} onApprove={approve} />)
      )}
    </div>
  );
}
