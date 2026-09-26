import { useLiveQuery } from 'dexie-react-hooks';
import { EkrEditor } from '../../components/EkrEditor';
import { VehicleChip } from '../../components/VehicleChip';
import { t } from '../../i18n/id';
import { db } from '../../lib/db';
import { PRESETS } from '../../lib/presets';
import { ekrComplete } from '../../lib/session';
import type { StepProps } from './index';

const tw = t.wizard;

export function StepClassification({ draft: d, patch }: StepProps) {
  const templates = useLiveQuery(() => db.templates.toArray()) ?? [];
  const order = (id: string) => {
    const i = PRESETS.findIndex((p) => p.id === id);
    return i < 0 ? PRESETS.length : i;
  };
  const sorted = [...templates].sort(
    (a, b) => order(a.id) - order(b.id) || a.name.localeCompare(b.name, 'id'),
  );

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="label">{tw.template}</h2>
        <p className="text-sm text-muted">{tw.templateHint}</p>
        <ul className="space-y-2">
          {sorted.map((tpl) => {
            const selected = d.classification.id === tpl.id;
            return (
              <li key={tpl.id}>
                <label
                  className={`card flex cursor-pointer gap-3 p-3 ${selected ? 'border-ink ring-1 ring-ink' : ''}`}
                >
                  <input
                    type="radio"
                    name="template"
                    className="mt-0.5 size-5 shrink-0 accent-ink"
                    checked={selected}
                    onChange={() => patch({ classification: structuredClone(tpl) })}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{tpl.name}</span>
                    <span className="mt-2 flex flex-wrap gap-1">
                      {tpl.vehicleTypes.map((v) => (
                        <VehicleChip key={v.code} code={v.code} color={v.color} />
                      ))}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="label">{tw.ekrTitle}</h2>
        {!ekrComplete(d) && (
          <p className="rounded-xl bg-parsial p-3 text-sm font-medium">{tw.ekrMissing}</p>
        )}
        <EkrEditor
          key={d.classification.id}
          types={d.classification.vehicleTypes}
          onChange={(vehicleTypes) =>
            patch({ classification: { ...d.classification, vehicleTypes } })
          }
        />
      </section>
    </div>
  );
}
