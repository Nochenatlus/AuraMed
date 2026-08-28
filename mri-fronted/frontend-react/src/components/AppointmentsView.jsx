import { useState } from 'react';
import { useAppointments } from '../hooks/useAppointments.js';
import { api } from '../lib/api.js';
import { DEVICES, DEVICE_BY_ID, defaultDurationForType } from '../lib/constants.js';
import { fmtDate } from '../lib/format.js';
import StatusTag from './StatusTag.jsx';

const sectionCard = { border: '1px solid var(--color-divider)', padding: 'var(--space-4)', gap: 'var(--space-3)' };
const CONN_LABEL = { canli: 'Canlı', baglaniyor: 'Bağlanıyor…', kopuk: 'Yeniden bağlanıyor…', demo: 'Yoklama modu' };

const hhmm = (ms) => new Date(ms).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
const dmy = (ms) => new Date(ms).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const startMsOf = (date, time) => (date && time ? new Date(date + 'T' + time).getTime() : NaN);
const pad2 = (n) => String(n).padStart(2, '0');
const toTimeInput = (d) => pad2(d.getHours()) + ':' + pad2(d.getMinutes());

/** Teknisyenin bir durumdan geçebileceği aksiyonlar. */
function techActions(status) {
  switch (status) {
    case 'Scheduled': return [
      { to: 'Waiting', label: 'Geldi', icon: 'ph ph-user-check', cls: 'btn-primary' },
      { to: 'NotArrived', label: 'Gelmedi', icon: 'ph ph-user-minus', cls: 'btn-secondary' },
      { to: 'Cancelled', label: 'İptal', icon: 'ph ph-x', cls: 'btn-ghost' }
    ];
    case 'Waiting': return [
      { to: 'Running', label: 'Çalıştır', icon: 'ph ph-play', cls: 'btn-primary' },
      { to: 'Cancelled', label: 'İptal', icon: 'ph ph-x', cls: 'btn-ghost' }
    ];
    case 'Running': return [
      { to: 'ImageCreated', label: 'Görüntü Oluşturuldu', icon: 'ph ph-image-square', cls: 'btn-primary' },
      { to: 'Cancelled', label: 'İptal', icon: 'ph ph-x', cls: 'btn-ghost' }
    ];
    default: return [];
  }
}

export default function AppointmentsView({ technicianName }) {
  // Scope vermiyoruz: teknisyen hem aktif randevuları hem de doktor sürecine devredilenleri görür.
  const { appointments, connection, error: loadError, reload } = useAppointments(true, null);

  const [deviceId, setDeviceId] = useState(DEVICES[0].id);
  const [patient, setPatient] = useState('');
  const [protocol, setProtocol] = useState('');
  const [date, setDate] = useState(fmtDate(new Date()));
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(defaultDurationForType(DEVICES[0].type));
  const [notes, setNotes] = useState('');

  const [availability, setAvailability] = useState(null); // { available, conflicts, suggestedStart }
  const [conflictModal, setConflictModal] = useState(null); // { conflicts, suggestedStart }
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  const device = DEVICE_BY_ID[deviceId] || DEVICES[0];

  const onDeviceChange = (id) => {
    setDeviceId(id);
    setDuration(defaultDurationForType((DEVICE_BY_ID[id] || DEVICES[0]).type));
    setAvailability(null);
  };

  const resetForm = () => { setPatient(''); setProtocol(''); setNotes(''); setAvailability(null); };

  const checkAvailability = async () => {
    setError(''); setNotice(''); setAvailability(null); setConflictModal(null);
    const startMs = startMsOf(date, time);
    if (!Number.isFinite(startMs)) { setError('Geçerli bir tarih ve saat seçin.'); return null; }
    if (!(duration > 0)) { setError('Süre 0’dan büyük olmalı.'); return null; }
    setChecking(true);
    try {
      const res = await api.appointmentAvailability({ deviceKey: device.id, startMs, durationMinutes: duration });
      if (res.available) {
        setAvailability(res);
      } else {
        // Dolu ise en yakın müsait saati modal ile göster.
        setConflictModal({ conflicts: res.conflicts, suggestedStart: res.suggestedStart });
      }
      return res;
    } catch (e) {
      setError(e.message); return null;
    } finally {
      setChecking(false);
    }
  };

  /** Modaldaki "en yakın müsait" saati forma uygular. */
  const applySuggestion = () => {
    if (!conflictModal?.suggestedStart) return;
    const d = new Date(conflictModal.suggestedStart);
    setDate(fmtDate(d));
    setTime(toTimeInput(d));
    setConflictModal(null);
    setAvailability(null);
    setNotice('En yakın müsait saat forma uygulandı. Tekrar kontrol edip oluşturabilirsiniz.');
  };

  const create = async () => {
    setError(''); setNotice('');
    if (!patient.trim()) { setError('Hasta adı zorunludur.'); return; }
    const startMs = startMsOf(date, time);
    if (!Number.isFinite(startMs)) { setError('Geçerli bir tarih ve saat seçin.'); return; }
    if (!(duration > 0)) { setError('Süre 0’dan büyük olmalı.'); return; }

    const avail = await checkAvailability();
    if (!avail) return;
    if (!avail.available) return; // Dolu — en yakın müsait saat modalı checkAvailability tarafından açıldı.

    setSaving(true);
    try {
      await api.appointmentCreate({
        deviceKey: device.id, deviceName: device.name, deviceType: device.type,
        patientName: patient.trim(), patientProtocolNo: protocol.trim() || null,
        scheduledStart: new Date(startMs).toISOString(), durationMinutes: duration,
        notes: notes.trim() || null, createdBy: technicianName
      });
      setNotice('Randevu oluşturuldu.');
      resetForm();
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id, status) => {
    setBusyId(id); setError('');
    try {
      await api.appointmentChangeStatus(id, status);
      reload();
    } catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  const removeAppt = async (id) => {
    setBusyId(id); setError('');
    try { await api.appointmentDelete(id); reload(); }
    catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  const active = appointments.filter((a) => ['Scheduled', 'Waiting', 'Running'].includes(a.status));
  const closed = appointments.filter((a) => ['NotArrived', 'Cancelled', 'ImageCreated', 'ImageEvaluation', 'Reporting', 'Approved'].includes(a.status));

  return (
    <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Randevu oluşturma + müsaitlik */}
      <div className="card" style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <i className="ph ph-calendar-plus" style={{ fontSize: 20, color: 'var(--color-text)' }} />
          <span className="card-title">Yeni Çekim Randevusu</span>
          <span style={{ flex: 1 }} />
          <span className="tag tag-neutral" style={{ gap: 5 }}><i className="ph ph-broadcast" />{CONN_LABEL[connection]}</span>
        </div>
        <div className="card-meta">Cihazın seçilen tarih/saat aralığındaki müsaitliği kontrol edilir; çakışan randevu varsa engellenir.</div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div className="field" style={{ marginBottom: 0, width: 220 }}>
            <label>Cihaz</label>
            <select className="input" value={deviceId} onChange={(e) => onDeviceChange(e.target.value)}>
              {DEVICES.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.type}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, width: 200 }}>
            <label>Hasta Adı</label>
            <input className="input" value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="Ad Soyad" autoComplete="off" />
          </div>
          <div className="field" style={{ marginBottom: 0, width: 150 }}>
            <label>Protokol No</label>
            <input className="input" value={protocol} onChange={(e) => setProtocol(e.target.value)} placeholder="Opsiyonel" autoComplete="off" />
          </div>
          <div className="field" style={{ marginBottom: 0, width: 150 }}>
            <label>Tarih</label>
            <input className="input" type="date" value={date} onChange={(e) => { setDate(e.target.value); setAvailability(null); }} />
          </div>
          <div className="field" style={{ marginBottom: 0, width: 110 }}>
            <label>Başlangıç</label>
            <input className="input" type="time" value={time} onChange={(e) => { setTime(e.target.value); setAvailability(null); }} />
          </div>
          <div className="field" style={{ marginBottom: 0, width: 110 }}>
            <label>Süre (dk)</label>
            <input className="input" type="number" min="5" step="5" value={duration} onChange={(e) => { setDuration(Number(e.target.value)); setAvailability(null); }} />
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label>Not (opsiyonel)</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Örn. istem türü / hekim notu" autoComplete="off" />
          </div>
        </div>

        {availability?.available && (
          <div style={{
            border: '1px solid color-mix(in srgb,#22c55e 45%,transparent)',
            background: 'color-mix(in srgb,#22c55e 8%,transparent)',
            borderRadius: 'var(--radius-sm)', padding: 'var(--space-2) var(--space-3)', fontSize: 12
          }}>
            <span style={{ color: '#15803d' }}><i className="ph ph-check-circle" /> Seçilen aralık müsait — {device.name}, {dmy(startMsOf(date, time))} {time} ({duration} dk).</span>
          </div>
        )}

        {error && <div style={{ fontSize: 12, color: '#b91c1c' }}><i className="ph ph-warning-circle" /> {error}</div>}
        {notice && <div style={{ fontSize: 12, color: 'var(--color-accent-300)' }}><i className="ph ph-check-circle" /> {notice}</div>}
        {loadError && !error && <div style={{ fontSize: 12, color: '#b91c1c' }}><i className="ph ph-warning-circle" /> {loadError}</div>}

        <div className="hr" style={{ margin: 'var(--space-1) 0' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={checkAvailability} disabled={checking}>
            <i className="ph ph-calendar-check" />{checking ? 'Kontrol ediliyor…' : 'Müsaitlik Kontrol Et'}
          </button>
          <button className="btn btn-primary" onClick={create} disabled={saving}>
            <i className="ph ph-plus-circle" />{saving ? 'Oluşturuluyor…' : 'Randevu Oluştur'}
          </button>
        </div>
      </div>

      {/* Aktif randevular / çekim süreci */}
      <div className="card" style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <i className="ph ph-list-checks" style={{ fontSize: 18, color: 'var(--color-text)' }} />
          <span className="card-title">Aktif Randevular & Çekim Süreci</span>
        </div>
        {active.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13 }}>Aktif randevu yok.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Hasta Adı</th><th>Hasta ID</th><th>Çekim Cihazı</th><th>Randevu</th><th>Durum</th><th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {active.map((a) => {
                  const startMs = new Date(a.scheduledStart).getTime();
                  const endMs = new Date(a.scheduledEnd).getTime();
                  return (
                    <tr key={a.id}>
                      <td style={{ verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="ph-fill ph-user-circle" style={{ fontSize: 18, color: 'var(--color-accent-300)', flex: 'none' }} />
                          <span style={{ fontWeight: 700 }}>{a.patientName}</span>
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'top', color: 'var(--color-neutral-400)', whiteSpace: 'nowrap' }}>{a.patientProtocolNo || '—'}</td>
                      <td style={{ verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="ph ph-device-mobile-camera" style={{ color: 'var(--color-neutral-400)', flex: 'none' }} />
                          <span>{a.deviceName}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-neutral-500)', marginLeft: 22 }}>
                          {a.deviceType}{a.notes ? ' · ' + a.notes : ''}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div>{dmy(startMs)}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>{hhmm(startMs)}–{hhmm(endMs)} · {a.durationMinutes} dk</div>
                      </td>
                      <td style={{ verticalAlign: 'top' }}><StatusTag status={a.status} /></td>
                      <td style={{ verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {techActions(a.status).map((act) => (
                            <button key={act.to} className={'btn ' + act.cls} disabled={busyId === a.id} onClick={() => changeStatus(a.id, act.to)} style={{ fontSize: 12 }}>
                              <i className={act.icon} />{act.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Geçmiş / doktor sürecine geçenler */}
      <div className="card" style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <i className="ph ph-clock-counter-clockwise" style={{ fontSize: 18, color: 'var(--color-text)' }} />
          <span className="card-title">Sonuçlanan / Doktor Sürecinde</span>
        </div>
        {closed.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13 }}>Kayıt yok.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Hasta Adı</th><th>Hasta ID</th><th>Cihaz</th><th>Tarih/Saat</th><th>Durum</th><th /></tr></thead>
              <tbody>
                {closed.map((a) => {
                  const startMs = new Date(a.scheduledStart).getTime();
                  const removable = a.status === 'NotArrived' || a.status === 'Cancelled';
                  return (
                    <tr key={a.id}>
                      <td>{a.patientName}</td>
                      <td style={{ color: 'var(--color-neutral-400)', whiteSpace: 'nowrap' }}>{a.patientProtocolNo || '—'}</td>
                      <td style={{ color: 'var(--color-neutral-400)' }}>{a.deviceName} · {a.deviceType}</td>
                      <td style={{ color: 'var(--color-neutral-400)', whiteSpace: 'nowrap' }}>{dmy(startMs)} {hhmm(startMs)}</td>
                      <td><StatusTag status={a.status} /></td>
                      <td style={{ textAlign: 'right' }}>
                        {removable && (
                          <button className="btn btn-ghost btn-icon" disabled={busyId === a.id} onClick={() => removeAppt(a.id)} aria-label="Sil" title="Kaydı sil">
                            <i className="ph ph-trash" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {conflictModal && (
        <div className="dialog-backdrop" style={{ zIndex: 60 }}>
          <div className="dialog" style={{ animation: 'modalIn .18s ease-out', maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <i className="ph ph-calendar-x" style={{ fontSize: 24, color: '#b91c1c' }} />
              <div className="dialog-title">Seçilen saat dolu</div>
            </div>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ fontSize: 13 }}>
                {device.name} · {dmy(startMsOf(date, time))} {time} ({duration} dk) aralığı başka randevularla çakışıyor:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {conflictModal.conflicts.map((c) => (
                  <span key={c.id} style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>
                    • {c.patientName} — {hhmm(new Date(c.scheduledStart).getTime())}–{hhmm(new Date(c.scheduledEnd).getTime())}
                  </span>
                ))}
              </div>
              {conflictModal.suggestedStart && (
                <div style={{
                  marginTop: 6, padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)',
                  background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <i className="ph ph-clock-clockwise" style={{ fontSize: 20, color: 'var(--color-accent)', flex: 'none' }} />
                  <span style={{ fontSize: 13 }}>
                    En yakın müsait saat: <b>{dmy(new Date(conflictModal.suggestedStart).getTime())} · {toTimeInput(new Date(conflictModal.suggestedStart))}</b>
                  </span>
                </div>
              )}
            </div>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setConflictModal(null)}>Kapat</button>
              {conflictModal.suggestedStart && (
                <button className="btn btn-primary" onClick={applySuggestion}><i className="ph ph-check" />Bu Saati Seç</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
