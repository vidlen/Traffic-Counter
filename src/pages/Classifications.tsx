import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router';
import { AppBar, Page } from '../components/AppBar';
import { VehicleChip } from '../components/VehicleChip';
import { t } from '../i18n/id';
import { clock } from '../lib/clock';
import { db } from '../lib/db';
import { copyOf, PRESETS } from '../lib/presets';
import { toast } from '../store';
import type { ClassificationTemplate } from '../types';

const tc = t.classifications;

export function Classifications() {
  const navigate = useNavigate();
  const templates = useLiveQuery(() => db.templates.toArray());
  const activeIds = useLiveQuery(async () => {
    const active = await db.sessions.where('status').anyOf('BERJALAN', 'MENUNGGU').toArray();
    return new Set(active.map((s) => s.classification.id));
  });

  if (!templates || !activeIds) return <AppBar title={tc.title} />;

  const builtIn = PRESETS.map((p) => templates.find((x) => x.id === p.id)).filter((x) => !!x);
  const custom = templates
    .filter((x) => !x.builtIn)
    .sort((a, b) => a.name.localeCompare(b.name, 'id'));

  const duplicate = async (tpl: ClassificationTemplate) => {
    const copy = copyOf(tpl, crypto.randomUUID(), tc.copyName(tpl.name), clock.now());
    await db.templates.add(copy);
    navigate(`/klasifikasi/${copy.id}`);
  };
  const remove = async (tpl: ClassificationTemplate) => {
    if (!window.confirm(tc.confirmDelete(tpl.name))) return;
    await db.templates.delete(tpl.id);
    toast(tc.deleted);
  };

  const card = (tpl: ClassificationTemplate) => (
    <li key={tpl.id} className="card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">{tpl.name}</h3>
        <span className="shrink-0 text-sm text-muted tabular-nums">
          {tc.types(tpl.vehicleTypes.length)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tpl.vehicleTypes.map((v) => (
          <VehicleChip key={v.code} code={v.code} color={v.color} />
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          className="btn btn-secondary flex-1"
          onClick={() => navigate(`/klasifikasi/${tpl.id}`)}
        >
          {tpl.builtIn ? tc.view : tc.edit}
        </button>
        <button className="btn btn-secondary flex-1" onClick={() => void duplicate(tpl)}>
          {tc.duplicate}
        </button>
        {!tpl.builtIn && (
          <button
            className="btn btn-secondary flex-1 text-danger"
            disabled={activeIds.has(tpl.id)}
            title={activeIds.has(tpl.id) ? tc.inUse : undefined}
            onClick={() => void remove(tpl)}
          >
            {tc.delete}
          </button>
        )}
      </div>
    </li>
  );

  return (
    <>
      <AppBar title={tc.title} />
      <Page>
        <p className="text-ink-2">{tc.intro}</p>
        <section className="space-y-3">
          <h2 className="label">{tc.builtIn}</h2>
          <ul className="space-y-3">{builtIn.map(card)}</ul>
        </section>
        <section className="space-y-3">
          <h2 className="label">{tc.custom}</h2>
          {custom.length ? (
            <ul className="space-y-3">{custom.map(card)}</ul>
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">
              {tc.noCustom}
            </p>
          )}
        </section>
      </Page>
    </>
  );
}
