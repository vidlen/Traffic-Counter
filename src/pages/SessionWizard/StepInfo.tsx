import { Field } from '../../components/Form';
import { t } from '../../i18n/id';
import type { StepProps } from './index';

const tw = t.wizard;

export function StepInfo({ draft: d, patch, showErrors }: StepProps) {
  const req = (v: string) => showErrors && !v.trim() && tw.required;
  return (
    <div className="space-y-5">
      <Field label={tw.location} error={req(d.location)}>
        <input
          className="input"
          value={d.location}
          onChange={(e) => patch({ location: e.target.value })}
        />
      </Field>
      <Field label={tw.project}>
        <input
          className="input"
          value={d.project}
          onChange={(e) => patch({ project: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={tw.date} error={req(d.date)}>
          <input
            type="date"
            className="input"
            value={d.date}
            onChange={(e) => patch({ date: e.target.value })}
          />
        </Field>
        <Field label={tw.surveyor} error={req(d.surveyor)}>
          <input
            className="input"
            autoComplete="name"
            value={d.surveyor}
            onChange={(e) => patch({ surveyor: e.target.value })}
          />
        </Field>
      </div>
      <Field label={tw.roadInfo} hint={tw.roadInfoHint}>
        <input
          className="input"
          value={d.roadInfo ?? ''}
          onChange={(e) => patch({ roadInfo: e.target.value })}
        />
      </Field>
      <Field label={tw.weather}>
        <select
          className="input"
          value={d.weather ?? ''}
          onChange={(e) => patch({ weather: e.target.value })}
        >
          <option value="">{tw.weatherNone}</option>
          {tw.weatherOptions.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
      </Field>
      <Field label={tw.remarks}>
        <textarea
          className="input min-h-24 py-2.5"
          value={d.remarks ?? ''}
          onChange={(e) => patch({ remarks: e.target.value })}
        />
      </Field>
    </div>
  );
}
