import { APPOINTMENT_STATUS, STATUS_TAG_CLASS } from '../lib/constants.js';

/** Randevu iş akışı durumunu ikon + etiket olarak renkli bir tag'de gösterdiğimiz kısım. */
export default function StatusTag({ status }) {
  const meta = APPOINTMENT_STATUS[status] || { label: status, icon: 'ph ph-circle', tone: 'neutral' };
  const cls = STATUS_TAG_CLASS[meta.tone] || 'tag-neutral';
  const spin = status === 'Running';
  return (
    <span className={'tag ' + cls} style={{ gap: 5 }}>
      <i className={meta.icon} style={{ fontSize: 13, animation: spin ? 'sweep 1.6s linear infinite' : undefined }} />
      {meta.label}
    </span>
  );
}
