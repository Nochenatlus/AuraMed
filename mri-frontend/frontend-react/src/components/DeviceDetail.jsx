import { useState } from 'react';
import { paramsForDevice, deviceFieldsForType } from '../lib/constants.js';
import { fmt, fmtDateTime, fmtCurrency } from '../lib/format.js';
import { useDeviceInfo, useDeviceRecords, useDeviceMaintenance, useDeviceCosts, useDeviceEvaluations } from '../hooks/useDeviceInfo.js';
import MainChart from './MainChart.jsx';

const MAINTENANCE_TYPES = ['Planlandı', 'Yapıldı'];
const EVALUATION_RESULTS = ['Başarılı', 'Kısmi', 'Başarısız'];

const todayIso = () => new Date().toISOString().slice(0, 10);
const dateOnly = (iso) => fmtDateTime(new Date(iso + 'T00:00:00')).slice(0, 10);

export default function DeviceDetail({ device, values, history, tickMs, alerts, occupied, showLiveData = true, onBack }) {
  const params = paramsForDevice(device.id);
  const FIELDS = deviceFieldsForType(device.type);
  const [info, updateInfo] = useDeviceInfo(device.id, device.type);
  const [records, addRecord, removeRecord] = useDeviceRecords(device.id);
  const [maintenance, addMaintenance, removeMaintenance] = useDeviceMaintenance(device.id);
  const [costs, addCost, removeCost] = useDeviceCosts(device.id);
  const [evaluations, addEvaluation, removeEvaluation] = useDeviceEvaluations(device.id);

  const [recordForm, setRecordForm] = useState({ date: todayIso(), count: '' });
  const [maintForm, setMaintForm] = useState({ date: todayIso(), type: MAINTENANCE_TYPES[0], note: '' });
  const [costForm, setCostForm] = useState({ description: '', quantity: '1', unitPrice: '' });
  const [evalForm, setEvalForm] = useState({ date: todayIso(), result: EVALUATION_RESULTS[0], note: '' });
  const [infoSaved, setInfoSaved] = useState(false);

  const saveInfo = () => {
    setInfoSaved(true);
    setTimeout(() => setInfoSaved(false), 2000);
  };

  const alert = params.some((p) => alerts[p.key]);
  const today = todayIso();
  const todayTotal = records.filter((r) => r.date === today).reduce((sum, r) => sum + Number(r.count || 0), 0);
  const totalCost = costs.reduce((sum, c) => sum + Number(c.quantity || 0) * Number(c.unitPrice || 0), 0);

  const submitRecord = (e) => {
    e.preventDefault();
    const count = Number(recordForm.count);
    if (!recordForm.date || !Number.isFinite(count) || count <= 0) return;
    addRecord({ date: recordForm.date, count });
    setRecordForm({ date: recordForm.date, count: '' });
  };

  const submitMaintenance = (e) => {
    e.preventDefault();
    if (!maintForm.date) return;
    addMaintenance({ date: maintForm.date, type: maintForm.type, note: maintForm.note.trim() });
    setMaintForm({ date: maintForm.date, type: maintForm.type, note: '' });
  };

  const submitCost = (e) => {
    e.preventDefault();
    const quantity = Number(costForm.quantity);
    const unitPrice = Number(costForm.unitPrice);
    if (!costForm.description.trim() || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) return;
    addCost({ description: costForm.description.trim(), quantity, unitPrice });
    setCostForm({ description: '', quantity: '1', unitPrice: '' });
  };

  const submitEvaluation = (e) => {
    e.preventDefault();
    if (!evalForm.date || !evalForm.note.trim()) return;
    addEvaluation({ date: evalForm.date, result: evalForm.result, note: evalForm.note.trim() });
    setEvalForm({ date: evalForm.date, result: evalForm.result, note: '' });
  };

  return (
    <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button className="btn btn-secondary btn-icon" onClick={onBack} aria-label="Geri">
          <i className="ph ph-arrow-left" />
        </button>
        <i className={device.icon} style={{ fontSize: 26, color: 'var(--color-text)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
          <span className="card-title" style={{ margin: 0, fontSize: 20 }}>{device.name}</span>
          <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{device.location}</span>
        </div>
        <span className={'tag ' + (alert ? 'tag-accent' : 'tag-neutral')} style={{ marginLeft: 'var(--space-2)' }}>{alert ? 'Uyarı' : 'Normal'}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: occupied ? 'var(--color-accent-300)' : 'var(--color-neutral-400)' }}>
          <i className={occupied ? 'ph ph-user-focus' : 'ph ph-door-open'} />
          {occupied ? 'Oda dolu — hasta içeride' : 'Oda boş'}
        </span>
      </div>

      {showLiveData ? (
        <>
          <div className="card" style={{ gap: 'var(--space-3)' }}>
            <span className="card-title">Canlı Değerler ve Eşikler</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
              {params.map((p) => {
                const v = values[p.key];
                const isAlert = alerts[p.key];
                return (
                  <div key={p.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--color-text) 3%, transparent)' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-neutral-500)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <i className={p.icon} style={{ fontSize: 13, color: 'var(--color-text)' }} />{p.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontSize: 24, color: isAlert ? 'var(--color-accent-300)' : 'var(--color-text)' }}>{fmt(p, v)}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{p.unit}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--color-neutral-400)' }}>Eşik: {fmt(p, p.threshold)} {p.unit} · Normal: {fmt(p, p.min)}–{fmt(p, p.max)} {p.unit}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)' }}>
              <i className="ph ph-chart-line" style={{ fontSize: 18, color: 'var(--color-text)' }} />
              <span className="card-title">Grafikler ve Eşik Değerleri</span>
            </div>
            {params.map((p) => (
              <div key={p.key} style={{ padding: '0 var(--space-3) var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-neutral-500)', padding: 'var(--space-3) 0' }}>
                  <i className={p.icon} style={{ fontSize: 14, color: 'var(--color-text)' }} />{p.label}
                </div>
                <MainChart param={p} series={history[p.key]} tickMs={tickMs} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="card" style={{ gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <i className="ph ph-scan" style={{ fontSize: 18, color: 'var(--color-text)' }} />
                <span className="card-title">Günlük Çekim / Randevu Kaydı</span>
              </div>
              <span className="card-meta">Bugün toplam: <b style={{ color: 'var(--color-text)' }}>{todayTotal}</b></span>
            </div>

            <form onSubmit={submitRecord} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <div className="field" style={{ width: 170, marginBottom: 0 }}>
                  <label>Tarih</label>
                  <input className="input" type="date" value={recordForm.date} onChange={(e) => setRecordForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="field" style={{ width: 150, marginBottom: 0 }}>
                  <label>Çekim / Randevu Sayısı</label>
                  <input className="input" type="number" min="1" value={recordForm.count} onChange={(e) => setRecordForm((f) => ({ ...f, count: e.target.value }))} placeholder="Örn. 12" />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" style={{ alignSelf: 'flex-end' }}><i className="ph ph-plus" />Ekle</button>
            </form>

            {records.length > 0 ? (
              <table className="table">
                <thead><tr><th>Tarih</th><th>Çekim / Randevu Sayısı</th><th /></tr></thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td>{dateOnly(r.date)}</td>
                      <td>{r.count}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => removeRecord(r.id)} aria-label="Kaydı sil">
                          <i className="ph ph-trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13 }}>
                Henüz kayıt eklenmedi.
              </div>
            )}
          </div>

          <div className="card" style={{ gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <i className="ph ph-clipboard-text" style={{ fontSize: 18, color: 'var(--color-text)' }} />
              <span className="card-title">Cihaz Teknik Bilgileri</span>
            </div>
            <div className="card-meta">Bu alanlar sistem tarafından doldurulmaz; teknisyen tarafından elle girilir.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(max(180px, calc(33.333% - var(--space-3))), 1fr))', gap: 'var(--space-3)' }}>
              {FIELDS.map((f) => (
                <div className="field" key={f.key}>
                  <label>{f.label}</label>
                  <input className="input" value={info[f.key]} placeholder={f.placeholder} onChange={(e) => updateInfo(f.key, e.target.value)} />
                </div>
              ))}
              <div className="field">
                <label>Son Kalibrasyon / Bakım Tarihi</label>
                <input className="input" type="date" value={info.lastMaintenance} onChange={(e) => updateInfo('lastMaintenance', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              {infoSaved && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#15803d' }}>
                  <i className="ph ph-check-circle" />Kaydedildi
                </span>
              )}
              <button type="button" className="btn btn-primary" onClick={saveInfo}><i className="ph ph-floppy-disk" />Kaydet</button>
            </div>
          </div>

          <div className="card" style={{ gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <i className="ph ph-wrench" style={{ fontSize: 18, color: 'var(--color-text)' }} />
              <span className="card-title">Bakım / Kontrol Takvimi</span>
            </div>
            <div className="card-meta">Yapılan bakımları ve planlanan kontrol tarihlerini buradan kaydedin.</div>

            <form onSubmit={submitMaintenance} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <div className="field" style={{ width: 170, marginBottom: 0 }}>
                  <label>Tarih</label>
                  <input className="input" type="date" value={maintForm.date} onChange={(e) => setMaintForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="field" style={{ width: 150, marginBottom: 0 }}>
                  <label>Tür</label>
                  <select className="input" value={maintForm.type} onChange={(e) => setMaintForm((f) => ({ ...f, type: e.target.value }))}>
                    {MAINTENANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                  <label>Açıklama</label>
                  <input className="input" value={maintForm.note} onChange={(e) => setMaintForm((f) => ({ ...f, note: e.target.value }))} placeholder="Örn. Yıllık kalibrasyon kontrolü" />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" style={{ alignSelf: 'flex-end' }}><i className="ph ph-plus" />Ekle</button>
            </form>

            {maintenance.length > 0 ? (
              <table className="table">
                <thead><tr><th>Tarih</th><th>Tür</th><th>Açıklama</th><th /></tr></thead>
                <tbody>
                  {maintenance.map((m) => (
                    <tr key={m.id}>
                      <td>{dateOnly(m.date)}</td>
                      <td><span className={'tag ' + (m.type === 'Yapıldı' ? 'tag-neutral' : 'tag-outline')}>{m.type}</span></td>
                      <td style={{ color: 'var(--color-neutral-400)' }}>{m.note || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => removeMaintenance(m.id)} aria-label="Kaydı sil">
                          <i className="ph ph-trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13 }}>
                Henüz bakım / kontrol kaydı eklenmedi.
              </div>
            )}
          </div>

          <div className="card" style={{ gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <i className="ph ph-calculator" style={{ fontSize: 18, color: 'var(--color-text)' }} />
                <span className="card-title">Yenileme / Değiştirme Maliyet Hesaplaması</span>
              </div>
              <span className="card-meta">Genel toplam: <b style={{ color: 'var(--color-text)' }}>{fmtCurrency(totalCost)}</b></span>
            </div>

            <form onSubmit={submitCost} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                  <label>Açıklama</label>
                  <input className="input" value={costForm.description} onChange={(e) => setCostForm((f) => ({ ...f, description: e.target.value }))} placeholder="Örn. Gradient bobini değişimi" />
                </div>
                <div className="field" style={{ width: 110, marginBottom: 0 }}>
                  <label>Miktar</label>
                  <input className="input" type="number" min="1" value={costForm.quantity} onChange={(e) => setCostForm((f) => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div className="field" style={{ width: 160, marginBottom: 0 }}>
                  <label>Birim Fiyat (₺)</label>
                  <input className="input" type="number" min="0" step="0.01" value={costForm.unitPrice} onChange={(e) => setCostForm((f) => ({ ...f, unitPrice: e.target.value }))} placeholder="Örn. 15000" />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" style={{ alignSelf: 'flex-end' }}><i className="ph ph-plus" />Ekle</button>
            </form>

            {costs.length > 0 ? (
              <table className="table">
                <thead><tr><th>Açıklama</th><th>Miktar</th><th>Birim Fiyat</th><th>Toplam</th><th /></tr></thead>
                <tbody>
                  {costs.map((c) => (
                    <tr key={c.id}>
                      <td>{c.description}</td>
                      <td>{c.quantity}</td>
                      <td>{fmtCurrency(c.unitPrice)}</td>
                      <td style={{ color: 'var(--color-accent-300)' }}>{fmtCurrency(c.quantity * c.unitPrice)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => removeCost(c.id)} aria-label="Kaydı sil">
                          <i className="ph ph-trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13 }}>
                Henüz maliyet kalemi eklenmedi.
              </div>
            )}
          </div>

          <div className="card" style={{ gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <i className="ph ph-clipboard-text" style={{ fontSize: 18, color: 'var(--color-text)' }} />
              <span className="card-title">Bakım / Yenileme Sonrası Değerlendirme</span>
            </div>
            <div className="card-meta">Yapılan bakım veya yenileme işleminin sonucunu değerlendirin.</div>

            <form onSubmit={submitEvaluation} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <div className="field" style={{ width: 170 }}>
                  <label>Tarih</label>
                  <input className="input" type="date" value={evalForm.date} onChange={(e) => setEvalForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="field" style={{ width: 150 }}>
                  <label>Sonuç</label>
                  <select className="input" value={evalForm.result} onChange={(e) => setEvalForm((f) => ({ ...f, result: e.target.value }))}>
                    {EVALUATION_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Değerlendirme Notu</label>
                <textarea className="input" rows={2} value={evalForm.note} onChange={(e) => setEvalForm((f) => ({ ...f, note: e.target.value }))} placeholder="Örn. Kalibrasyon sonrası ölçümler normal aralıkta." />
              </div>
              <button className="btn btn-primary" type="submit" style={{ alignSelf: 'flex-end' }}><i className="ph ph-plus" />Ekle</button>
            </form>

            {evaluations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {evaluations.map((ev) => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderTop: '1px solid var(--color-divider)' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-neutral-500)', width: 80, flex: 'none' }}>{dateOnly(ev.date)}</span>
                    <span className={'tag ' + (ev.result === 'Başarılı' ? 'tag-neutral' : ev.result === 'Kısmi' ? 'tag-outline' : 'tag-accent')} style={{ flex: 'none' }}>{ev.result}</span>
                    <span style={{ fontSize: 13, flex: 1 }}>{ev.note}</span>
                    <button className="btn btn-ghost btn-icon" onClick={() => removeEvaluation(ev.id)} aria-label="Kaydı sil">
                      <i className="ph ph-trash" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13 }}>
                Henüz değerlendirme eklenmedi.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
