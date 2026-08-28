import { Fragment, useState } from 'react';
import { useAppointments } from '../hooks/useAppointments.js';
import { loadReport } from './ReportingView.jsx';
import StatusTag from './StatusTag.jsx';

const sectionCard = { border: '1px solid var(--color-divider)', padding: 'var(--space-4)', gap: 'var(--space-3)' };
const CONN_LABEL = { canli: 'Canlı', baglaniyor: 'Bağlanıyor…', kopuk: 'Yeniden bağlanıyor…', demo: 'Yoklama modu' };

const dmy = (ms) => new Date(ms).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const hhmm = (ms) => new Date(ms).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

export default function ApprovedReportsView() {
  const { appointments, connection, loading } = useAppointments(true, 'doctor');
  const [openId, setOpenId] = useState(null);

  const approved = appointments.filter((a) => a.status === 'Approved');

  return (
    <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="card" style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <i className="ph ph-seal-check" style={{ fontSize: 20, color: 'var(--color-text)' }} />
          <span className="card-title">Onaylanmış Raporlar</span>
          <span style={{ flex: 1 }} />
          <span className="tag tag-neutral" style={{ gap: 5 }}><i className="ph ph-broadcast" />{CONN_LABEL[connection]}</span>
        </div>
        <div className="card-meta">Hekim onayı verilen istemler burada saklanır. Bir satıra tıklayınca rapor metni görüntülenir.</div>
      </div>

      <div className="card" style={sectionCard}>
        {approved.length === 0 ? (
          <div style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
            <i className="ph ph-seal-check" style={{ fontSize: 30 }} />
            {loading ? 'Yükleniyor…' : 'Henüz onaylanmış rapor yok.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Hasta Adı</th><th>Hasta ID</th><th>Cihaz</th><th>Tarih/Saat</th><th>Durum</th><th /></tr></thead>
              <tbody>
                {approved.map((a) => {
                  const startMs = new Date(a.scheduledStart).getTime();
                  const report = loadReport(a.id);
                  const open = openId === a.id;
                  return (
                    <Fragment key={a.id}>
                      <tr style={{ cursor: 'pointer' }} onClick={() => setOpenId(open ? null : a.id)}>
                        <td>{a.patientName}</td>
                        <td style={{ color: 'var(--color-neutral-400)', whiteSpace: 'nowrap' }}>{a.patientProtocolNo || '—'}</td>
                        <td style={{ color: 'var(--color-neutral-400)' }}>{a.deviceName} · {a.deviceType}</td>
                        <td style={{ color: 'var(--color-neutral-400)', whiteSpace: 'nowrap' }}>{dmy(startMs)} {hhmm(startMs)}</td>
                        <td><StatusTag status={a.status} /></td>
                        <td style={{ textAlign: 'right' }}>
                          <i className={open ? 'ph ph-caret-up' : 'ph ph-caret-down'} style={{ color: 'var(--color-neutral-400)' }} />
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={6} style={{ background: 'var(--color-bg)' }}>
                            <div style={{ padding: 'var(--space-2) var(--space-3)' }}>
                              <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-neutral-500)', marginBottom: 6 }}>Rapor</div>
                              {report ? (
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, color: 'var(--color-text)' }}>{report}</pre>
                              ) : (
                                <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>Bu rapor bu tarayıcıda kayıtlı değil (rapor metni yerel taslak olarak saklanır).</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
