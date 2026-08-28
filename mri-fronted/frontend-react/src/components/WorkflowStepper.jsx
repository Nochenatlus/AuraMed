import { APPOINTMENT_STATUS } from '../lib/constants.js';

/** Doktor iş akışının sırası. */
const DOCTOR_STAGES = ['ImageCreated', 'ImageEvaluation', 'Reporting', 'Approved'];

/** Doktor sürecinin aşama göstergesi — dikey (alt alta), tamamlananlar işaretli. */
export default function WorkflowStepper({ status }) {
  const currentIdx = DOCTOR_STAGES.indexOf(status);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {DOCTOR_STAGES.map((s, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        const color = done ? 'var(--color-accent)' : current ? 'var(--color-accent-300)' : 'var(--color-neutral-500)';
        const last = i === DOCTOR_STAGES.length - 1;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch' }}>
              <i
                className={done ? 'ph-fill ph-check-circle' : current ? 'ph-fill ph-circle' : 'ph ph-circle'}
                style={{ fontSize: 15, color, marginTop: 1 }}
              />
              {!last && <span style={{ width: 2, flex: 1, minHeight: 14, background: done ? 'var(--color-accent)' : 'var(--color-divider)' }} />}
            </div>
            <span style={{
              fontSize: 12, fontWeight: current ? 700 : 500, color,
              paddingBottom: last ? 0 : 10, display: 'flex', alignItems: 'center', gap: 5
            }}>
              <i className={APPOINTMENT_STATUS[s].icon} style={{ fontSize: 13 }} />
              {APPOINTMENT_STATUS[s].label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
