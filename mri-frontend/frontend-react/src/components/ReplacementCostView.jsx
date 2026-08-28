import { Fragment, useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { DEVICES, DEVICE_BY_ID, COST_CATEGORIES, COST_CATEGORY_BY_KEY, CURRENCIES } from '../lib/constants.js';
import { fmtCurrency, fmtDateTime } from '../lib/format.js';

const emptyItem = () => ({ name: '', category: 'purchase', currency: 'USD', amount: '' });

/** Diğer bölümlerle aynı görünüm: görünür kenarlık + ferah iç boşluk. */
const sectionCard = { border: '1px solid var(--color-divider)', padding: 'var(--space-4)', gap: 'var(--space-3)' };

/** Bir tutarı kaynak para biriminden verilen günlük kurlarla TL'ye çevirir (canlı önizleme). */
function toTry(currency, amount, rates) {
  const a = Number(amount) || 0;
  if (currency === 'USD') return a * (rates?.usdTry || 0);
  if (currency === 'EUR') return a * (rates?.eurTry || 0);
  return a;
}

export default function ReplacementCostView({ technicianName }) {
  const [rates, setRates] = useState(null);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deviceId, setDeviceId] = useState(DEVICES[0].id);
  const [reason, setReason] = useState('');
  const [items, setItems] = useState([]);

  const [simulating, setSimulating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expanded, setExpanded] = useState(null); // { id, detail }

  const selectedDevice = DEVICE_BY_ID[deviceId] || DEVICES[0];

  const loadSaved = useCallback(async () => {
    try { setSaved(await api.replacementList()); } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rate = await api.replacementRates();
        setRates({ usdTry: rate.usdTry, eurTry: rate.eurTry, date: rate.date });
        await loadSaved();
      } catch (e) {
        setError(e.message || 'Veriler yüklenemedi. Backend çalışıyor mu?');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadSaved]);

  const total = items.reduce((sum, it) => sum + toTry(it.currency, it.amount, rates), 0);

  const handleSimulate = async () => {
    setSimulating(true); setError(''); setNotice('');
    try {
      const est = await api.replacementSimulate(selectedDevice.type);
      setRates((r) => ({ usdTry: est.usdRate, eurTry: est.eurRate, date: r?.date }));
      setItems(est.items.map((i) => ({ name: i.name, category: i.category, currency: i.currency, amount: i.amount })));
      setNotice(selectedDevice.name + ' için mock maliyet kalemleri getirildi. Düzenleyip kaydedebilirsiniz.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSimulating(false);
    }
  };

  const updateItem = (idx, field, value) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const handleSave = async () => {
    setError(''); setNotice('');
    if (items.length === 0) { setError('En az bir maliyet kalemi ekleyin.'); return; }
    // Kalem adı sütunu kaldırıldığı için ad kategoriden türetilir (simülasyondan gelen
    // açıklayıcı ad varsa korunur, elle eklenen kalemlerde kategori etiketi kullanılır).
    const cleaned = items.map((it) => ({
      ...it,
      name: it.name.trim() || (COST_CATEGORY_BY_KEY[it.category]?.label || 'Kalem'),
      amount: Number(it.amount)
    }));
    if (cleaned.some((it) => !Number.isFinite(it.amount) || it.amount < 0)) {
      setError('Tutarlar geçerli ve negatif olmayan sayılar olmalıdır.'); return;
    }

    setSaving(true);
    try {
      await api.replacementCreate({
        deviceKey: selectedDevice.id,
        deviceName: selectedDevice.name,
        deviceType: selectedDevice.type,
        reason: reason.trim() || null,
        createdBy: technicianName,
        items: cleaned.map((it) => ({ name: it.name, category: it.category, currency: it.currency, amount: it.amount }))
      });
      setNotice('Hesap veritabanına kaydedildi.');
      setItems([]); setReason('');
      await loadSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.replacementDelete(id);
      if (expanded?.id === id) setExpanded(null);
      await loadSaved();
    } catch (e) { setError(e.message); }
  };

  const toggleDetail = async (id) => {
    if (expanded?.id === id) { setExpanded(null); return; }
    try {
      const detail = await api.replacementDetail(id);
      setExpanded({ id, detail });
    } catch (e) { setError(e.message); }
  };

  const catLabel = (key) => COST_CATEGORY_BY_KEY[key]?.label || key;
  const catIcon = (key) => COST_CATEGORY_BY_KEY[key]?.icon || 'ph ph-tag';

  return (
    <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Başlık + cihaz seçimi + günlük kur */}
      <div className="card" style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <i className="ph ph-currency-circle-dollar" style={{ fontSize: 20, color: 'var(--color-text)' }} />
          <span className="card-title">Cihaz Değişim Maliyeti</span>
          <span style={{ flex: 1 }} />
          {rates && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <span className="tag tag-neutral">USD/TL: {Number(rates.usdTry).toFixed(4)}</span>
              <span className="tag tag-neutral">EUR/TL: {Number(rates.eurTry).toFixed(4)}</span>
            </div>
          )}
        </div>
        <div className="card-meta">
          Biyomedikal destek talebi sonrası cihaz değişimine karar verildiğinde çıkarılacak maliyet
          kalemlerini günlük (mock) kur üzerinden hesaplar ve veritabanına kaydeder.
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div className="field" style={{ marginBottom: 0, width: 260 }}>
            <label>Değiştirilecek Cihaz</label>
            <select className="input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              {DEVICES.map((d) => (
                <option key={d.id} value={d.id}>{d.name} · {d.type}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 260 }}>
            <label>Gerekçe / İlgili Talep (opsiyonel)</label>
            <input
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Örn. MRI nem sensörü sürekli hatalı — değişim kararı"
              autoComplete="off"
            />
          </div>
        </div>

        {error && <div style={{ fontSize: 12, color: '#b91c1c' }}><i className="ph ph-warning-circle" /> {error}</div>}
        {notice && <div style={{ fontSize: 12, color: 'var(--color-accent-300)' }}><i className="ph ph-check-circle" /> {notice}</div>}

        {/* Buton altta ve belirgin */}
        <div className="hr" style={{ margin: 'var(--space-1) 0' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSimulate} disabled={simulating || loading}>
            <i className="ph ph-magic-wand" />{simulating ? 'Hesaplanıyor…' : 'Maliyeti Simüle Et'}
          </button>
        </div>
      </div>

      {/* Düzenlenebilir maliyet kalemleri */}
      <div className="card" style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <i className="ph ph-list-checks" style={{ fontSize: 18, color: 'var(--color-text)' }} />
          <span className="card-title">Maliyet Kalemleri</span>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13 }}>
            Henüz kalem yok. "Maliyeti Simüle Et" ile mock kalemleri getirin veya "Kalem Ekle" ile elle ekleyin.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Kategori</th><th>Para Birimi</th><th>Tutar</th><th>TL Karşılığı</th><th />
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td style={{ minWidth: 180 }}>
                      <select className="input" value={it.category} onChange={(e) => updateItem(idx, 'category', e.target.value)}>
                        {COST_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="input" value={it.currency} onChange={(e) => updateItem(idx, 'currency', e.target.value)} style={{ width: 90 }}>
                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td>
                      <input className="input" type="number" min="0" step="0.01" value={it.amount}
                        onChange={(e) => updateItem(idx, 'amount', e.target.value)} style={{ width: 130 }} placeholder="0" />
                    </td>
                    <td style={{ color: 'var(--color-accent-300)', whiteSpace: 'nowrap' }}>{fmtCurrency(toTry(it.currency, it.amount, rates))}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => removeItem(idx)} aria-label="Kalemi sil" title="Kalemi sil">
                        <i className="ph ph-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="hr" style={{ margin: 'var(--space-1) 0' }} />

        {/* Toplam solda, butonlar altta ve belirgin */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>Toplam (TL):</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>{fmtCurrency(total)}</span>
          </div>
          <span style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={addItem}><i className="ph ph-plus" />Kalem Ekle</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || items.length === 0}>
            <i className="ph ph-floppy-disk" />{saving ? 'Kaydediliyor…' : 'Veritabanına Kaydet'}
          </button>
        </div>
      </div>

      {/* Kayıtlı hesaplar */}
      <div className="card" style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <i className="ph ph-database" style={{ fontSize: 18, color: 'var(--color-text)' }} />
          <span className="card-title">Kayıtlı Hesaplar</span>
        </div>
        <div className="card-meta">Veritabanına kaydedilen değişim maliyeti hesapları. Kur ve cihaz bilgisi kayıt anındaki haliyle saklanır.</div>

        {saved.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13 }}>
            {loading ? 'Yükleniyor…' : 'Henüz kayıtlı hesap yok.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr><th>Tarih</th><th>Cihaz</th><th>Tip</th><th>Gerekçe</th><th>Oluşturan</th><th>Kalem</th><th>Toplam (TL)</th><th /></tr>
              </thead>
              <tbody>
                {saved.map((s) => (
                  <Fragment key={s.id}>
                    <tr>
                      <td style={{ color: 'var(--color-neutral-400)', whiteSpace: 'nowrap' }}>{fmtDateTime(new Date(s.createdAt))}</td>
                      <td>{s.deviceName}</td>
                      <td style={{ color: 'var(--color-neutral-400)' }}>{s.deviceType}</td>
                      <td style={{ color: 'var(--color-neutral-400)' }}>{s.reason || '—'}</td>
                      <td style={{ color: 'var(--color-neutral-400)' }}>{s.createdBy}</td>
                      <td style={{ color: 'var(--color-neutral-400)' }}>{s.itemCount}</td>
                      <td style={{ color: 'var(--color-accent-300)', whiteSpace: 'nowrap' }}>{fmtCurrency(s.totalTry)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => toggleDetail(s.id)} aria-label="Detay" title="Kalem detayı">
                          <i className={expanded?.id === s.id ? 'ph ph-caret-up' : 'ph ph-caret-down'} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(s.id)} aria-label="Sil" title="Kaydı sil">
                          <i className="ph ph-trash" />
                        </button>
                      </td>
                    </tr>
                    {expanded?.id === s.id && expanded.detail && (
                      <tr>
                        <td colSpan={8} style={{ background: 'var(--color-bg)' }}>
                          <div style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 11, color: 'var(--color-neutral-500)', marginBottom: 6 }}>
                            Kayıt anındaki kur — USD/TL: {Number(expanded.detail.usdRate).toFixed(4)} · EUR/TL: {Number(expanded.detail.eurRate).toFixed(4)}
                          </div>
                          <table className="table" style={{ margin: 0 }}>
                            <thead><tr><th>Kalem</th><th>Kategori</th><th>Tutar</th><th>TL Karşılığı</th></tr></thead>
                            <tbody>
                              {expanded.detail.items.map((i, k) => (
                                <tr key={k}>
                                  <td>{i.name}</td>
                                  <td><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i className={catIcon(i.category)} style={{ color: 'var(--color-neutral-400)' }} />{catLabel(i.category)}</span></td>
                                  <td style={{ whiteSpace: 'nowrap' }}>{Number(i.amount).toLocaleString('tr-TR')} {i.currency}</td>
                                  <td style={{ color: 'var(--color-accent-300)', whiteSpace: 'nowrap' }}>{fmtCurrency(i.amountTry)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
