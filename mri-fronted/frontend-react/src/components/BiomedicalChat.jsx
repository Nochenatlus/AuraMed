import { useState } from 'react';
import { useBiomedicalChat } from '../hooks/useBiomedicalChat.js';
import { fmtDateTime } from '../lib/format.js';
import { downloadBiomedicalHistoryReport } from '../lib/api.js';

const TITLE_MIN = 5, TITLE_MAX = 60;
const DESC_MIN = 20, DESC_MAX = 400;

function validate(title, description) {
  const errors = {};
  if (title.length < TITLE_MIN) errors.title = 'Başlık en az ' + TITLE_MIN + ' karakter olmalı.';
  else if (title.length > TITLE_MAX) errors.title = 'Başlık en fazla ' + TITLE_MAX + ' karakter olabilir.';
  if (description.length < DESC_MIN) errors.description = 'Açıklama en az ' + DESC_MIN + ' karakter olmalı.';
  else if (description.length > DESC_MAX) errors.description = 'Açıklama en fazla ' + DESC_MAX + ' karakter olabilir.';
  return errors;
}

export default function BiomedicalChat({ technicianName }) {
  const { messages, history, send, toggleResolved, archive, removeHistory } = useBiomedicalChat();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState(null);
  const [exporting, setExporting] = useState(false);

  const reset = () => { setTitle(''); setDescription(''); setErrors(null); };

  const handleExportHistory = async () => {
    setExporting(true);
    try {
      const rows = history.map((h) => ({
        sentStr: fmtDateTime(new Date(h.timestamp)),
        title: h.title,
        sender: h.sender,
        description: h.description,
        resolvedStr: fmtDateTime(new Date(h.archivedAt))
      }));
      await downloadBiomedicalHistoryReport(rows, { createdAt: fmtDateTime(new Date()), technicianName });
    } finally {
      setExporting(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const t = title.trim(), d = description.trim();
    const nextErrors = validate(t, d);
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    send(technicianName, t, d);
    reset();
  };

  return (
    <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="card" style={{ gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <i className="ph ph-headset" style={{ fontSize: 20, color: 'var(--color-text)' }} />
          <span className="card-title">Biyomedikal Birim İletişimi</span>
        </div>
        <div className="card-meta">Bu alan biyomedikal birime iletilecek talep ve arıza bildirimlerini kaydeder; otomatik yanıt vermez.</div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="bio-title">Başlık</label>
            <input
              id="bio-title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn. MRI'de nem sensörü hatalı okuyor"
              autoComplete="off"
              aria-invalid={!!errors?.title}
            />
            {errors?.title && <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>{errors.title} </div>}
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="bio-desc">Açıklama</label>
            <textarea
              id="bio-desc"
              className="input"
              rows={4}
              style={{ resize: 'none' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sorunu nasıl fark ettiğinizi, hangi cihazı etkilediğini ve ne zaman başladığını yazın."
              aria-invalid={!!errors?.description}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: errors?.description ? '#b91c1c' : 'var(--color-neutral-500)' }}>
                {errors?.description || 'Tekrarlama adımları ve gözlemlediğiniz davranışı ekleyin.'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-neutral-500)', flex: 'none', marginLeft: 'var(--space-2)' }}>
                {description.length}/{DESC_MAX} karakter
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)'}}>
            <button type="button" className="btn btn-secondary" onClick={reset}>Sıfırla</button>
            <button type="submit" className="btn btn-primary"><i className="ph ph-paper-plane-tilt" />Gönder</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ gap: 'var(--space-3)' }}>
        <span className="card-title">Talepler</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {messages.length === 0 && (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13 }}>
              Henüz talep gönderilmedi.
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className="card" style={{ padding: 'var(--space-2) var(--space-3)', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 13, fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{m.title}</span>
                <span style={{ fontSize: 10, color: 'var(--color-neutral-500)', flex: 'none' }}>{fmtDateTime(new Date(m.timestamp))}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{m.sender}</div>
              <div style={{ fontSize: 13 }}>{m.description}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <button
                  className={'tag ' + (m.resolved ? 'tag-neutral' : 'tag-accent')}
                  style={{ border: 'none', cursor: 'pointer' }}
                  onClick={() => toggleResolved(m.id)}
                >
                  {m.resolved ? 'Çözüldü' : 'Beklemede'}
                </button>
                {m.resolved && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 11 }}
                    onClick={() => archive(m.id)}
                    aria-label="Karneye arşivle"
                    title="Karneye arşivle"
                  >
                    <i className="ph ph-archive-box" style={{ fontSize: 14 }} />Karneye arşivle
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ gap: 'var(--space-3)'}}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <i className="ph ph-clipboard-text" style={{ fontSize: 18, color: 'var(--color-text)' }} />
            <span className="card-title">Geçmiş Karnesi</span>
          </div>
          <button className="btn btn-secondary" onClick={handleExportHistory} disabled={exporting || history.length === 0}>
            <i className="ph ph-file-pdf" />{exporting ? 'Hazırlanıyor…' : 'PDF olarak indir'}
          </button>
        </div>
        <div className="card-meta">Çözülüp arşivlenen talepler burada kalıcı olarak saklanır; veri silinmez.</div>
        {history.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13 }}>
            Henüz arşivlenmiş talep yok.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr><th>Başlık</th><th>Gönderen</th><th>Gönderim</th><th>Çözüm</th><th /></tr>
              </thead>
              <tbody>
                {history.slice().reverse().map((h) => (
                  <tr key={h.id}>
                    <td>{h.title}</td>
                    <td style={{ color: 'var(--color-neutral-400)' }}>{h.sender}</td>
                    <td style={{ color: 'var(--color-neutral-400)' }}>{fmtDateTime(new Date(h.timestamp))}</td>
                    <td style={{ color: 'var(--color-neutral-400)' }}>{fmtDateTime(new Date(h.archivedAt))}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => removeHistory(h.id)} aria-label="Kaydı sil" title="Kaydı sil (admin)">
                        <i className="ph ph-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
