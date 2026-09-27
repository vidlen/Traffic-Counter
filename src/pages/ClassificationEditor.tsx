import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AppBar, Page } from '../components/AppBar';
import { VehicleChip } from '../components/VehicleChip';
import { VehicleIcon } from '../components/VehicleIcon';
import { t } from '../i18n/id';
import { clock } from '../lib/clock';
import { db } from '../lib/db';
import { fmtEkr, parseDecimal } from '../lib/format';
import {
  copyOf,
  iconOf,
  MAX_VEHICLE_TYPES,
  PKJI_CLASSES,
  type TemplateError,
  validateTemplate,
  VEHICLE_COLORS,
  VEHICLE_ICONS,
} from '../lib/presets';
import { toast } from '../store';
import type { ClassificationTemplate, PkjiClass, VehicleType } from '../types';

const te = t.editor;

export function ClassificationEditor() {
  const { id = '' } = useParams();
  const tpl = useLiveQuery(() => db.templates.get(id).then((x) => x ?? null), [id]);
  if (tpl === undefined) return <AppBar title={te.title} backTo="/klasifikasi" />;
  if (tpl === null)
    return (
      <>
        <AppBar title={te.title} backTo="/klasifikasi" />
        <Page>
          <p className="text-muted">{te.notFound}</p>
        </Page>
      </>
    );
  return <Editor key={tpl.id} initial={tpl} />;
}

interface Row {
  key: string;
  type: VehicleType;
  ekrText: string;
}

function Editor({ initial }: { initial: ClassificationTemplate }) {
  const navigate = useNavigate();
  const readOnly = initial.builtIn;
  const [name, setName] = useState(initial.name);
  const [rows, setRows] = useState<Row[]>(() =>
    initial.vehicleTypes.map((type) => ({
      key: crypto.randomUUID(),
      type,
      ekrText: fmtEkr(type.ekr),
    })),
  );
  const [errors, setErrors] = useState<TemplateError[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const patch = (key: string, p: Partial<VehicleType>, ekrText?: string) =>
    setRows((rs) =>
      rs.map((r) =>
        r.key === key ? { ...r, type: { ...r.type, ...p }, ekrText: ekrText ?? r.ekrText } : r,
      ),
    );
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const next = [...rs];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  const add = () => {
    const used = new Set(rows.map((r) => r.type.color));
    const key = crypto.randomUUID();
    const color = VEHICLE_COLORS.find((c) => !used.has(c)) ?? VEHICLE_COLORS[0];
    setRows((rs) => [
      ...rs,
      { key, ekrText: '', type: { code: '', name: '', color, ekr: null, inSkr: true, order: 0 } },
    ]);
    setOpenKey(key);
  };

  const build = (): ClassificationTemplate => ({
    ...initial,
    name: name.trim(),
    vehicleTypes: rows.map((r, order) => ({
      ...r.type,
      code: r.type.code.trim(),
      name: r.type.name.trim(),
      description: r.type.description?.trim() || undefined,
      ekr: parseDecimal(r.ekrText),
      order,
    })),
  });

  const save = async () => {
    const next = build();
    const errs = validateTemplate(next);
    setErrors(errs);
    if (errs.length) return toast(te.fixErrors, 'danger');
    await db.templates.put({ ...next, updatedAt: clock.now() });
    toast(te.saved);
    navigate('/klasifikasi');
  };

  const duplicate = async () => {
    const copy = copyOf(
      initial,
      crypto.randomUUID(),
      t.classifications.copyName(initial.name),
      clock.now(),
    );
    await db.templates.add(copy);
    navigate(`/klasifikasi/${copy.id}`, { replace: true });
  };

  const topErrors = errors.filter((e) => e.index === undefined);

  return (
    <>
      <AppBar title={readOnly ? te.viewTitle : te.title} backTo="/klasifikasi" />
      <Page>
        {readOnly && (
          <div className="card flex items-center gap-3 p-4">
            <p className="flex-1 text-sm text-ink-2">{te.readOnly}</p>
            <button className="btn btn-primary shrink-0" onClick={() => void duplicate()}>
              {t.classifications.duplicate}
            </button>
          </div>
        )}
        <div className="space-y-6">
          <fieldset disabled={readOnly}>
            <label className="block space-y-2">
              <span className="label">{te.name}</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          </fieldset>

          {topErrors.map((e) => (
            <p key={e.message} className="text-sm font-semibold text-danger">
              {e.message}
            </p>
          ))}

          <section className="space-y-3">
            <h2 className="label">{te.typesTitle(rows.length, MAX_VEHICLE_TYPES)}</h2>
            <ul className="space-y-2">
              {rows.map((r, i) => {
                const rowErrors = errors.filter((e) => e.index === i);
                const open = openKey === r.key || rowErrors.length > 0;
                return (
                  <li key={r.key} className="card overflow-hidden">
                    <button
                      type="button"
                      className="flex min-h-14 w-full items-center gap-3 px-3 text-left"
                      onClick={() => setOpenKey(open ? null : r.key)}
                      aria-expanded={open}
                    >
                      <VehicleChip v={r.type} />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {r.type.name || te.untitled}
                      </span>
                      <span className="text-sm text-muted tabular-nums">
                        {te.ekr} {r.ekrText || '-'}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`text-muted transition-transform ${open ? 'rotate-90' : ''}`}
                      >
                        ›
                      </span>
                    </button>
                    {rowErrors.map((e) => (
                      <p key={e.message} className="px-3 pb-2 text-sm font-semibold text-danger">
                        {e.message}
                      </p>
                    ))}
                    {open && (
                      <TypeFields
                        row={r}
                        index={i}
                        count={rows.length}
                        readOnly={readOnly}
                        onPatch={(p, ekrText) => patch(r.key, p, ekrText)}
                        onMove={(d) => move(i, d)}
                        onRemove={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            {!readOnly && (
              <button
                type="button"
                className="btn btn-secondary w-full"
                disabled={rows.length >= MAX_VEHICLE_TYPES}
                onClick={add}
              >
                + {te.add}
              </button>
            )}
          </section>
        </div>
        {!readOnly && <div className="h-20" />}
      </Page>
      {!readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            className="btn btn-primary mx-auto flex w-full max-w-xl"
            onClick={() => void save()}
          >
            {te.save}
          </button>
        </div>
      )}
    </>
  );
}

function TypeFields({
  row,
  index,
  count,
  readOnly,
  onPatch,
  onMove,
  onRemove,
}: {
  row: Row;
  index: number;
  count: number;
  readOnly: boolean;
  onPatch: (p: Partial<VehicleType>, ekrText?: string) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
}) {
  const v = row.type;
  return (
    <fieldset disabled={readOnly} className="space-y-4 border-t border-line p-3">
      <div className="grid grid-cols-[6rem_1fr] gap-3">
        <label className="space-y-1.5">
          <span className="label">{te.code}</span>
          <input
            className="input font-semibold"
            maxLength={5}
            autoCapitalize="characters"
            value={v.code}
            onChange={(e) => onPatch({ code: e.target.value })}
          />
        </label>
        <label className="space-y-1.5">
          <span className="label">{te.typeName}</span>
          <input
            className="input"
            value={v.name}
            onChange={(e) => onPatch({ name: e.target.value })}
          />
        </label>
      </div>
      <label className="block space-y-1.5">
        <span className="label">{te.description}</span>
        <input
          className="input"
          value={v.description ?? ''}
          onChange={(e) => onPatch({ description: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="label">{te.ekr}</span>
          <input
            className="input tabular-nums"
            inputMode="decimal"
            placeholder="-"
            value={row.ekrText}
            disabled={!v.inSkr}
            onChange={(e) => onPatch({}, e.target.value)}
          />
        </label>
        <label className="space-y-1.5">
          <span className="label">{te.pkji}</span>
          <select
            className="input"
            value={v.pkji ?? ''}
            onChange={(e) => onPatch({ pkji: (e.target.value || undefined) as PkjiClass })}
          >
            <option value="">{te.none}</option>
            {PKJI_CLASSES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="-mt-2 text-sm text-muted">{te.ekrHint}</p>
      <label className="flex min-h-12 items-center gap-3">
        <input
          type="checkbox"
          className="size-6 accent-ink"
          checked={v.inSkr}
          onChange={(e) => onPatch({ inSkr: e.target.checked })}
        />
        <span className="font-medium">{te.inSkr}</span>
      </label>
      <div className="space-y-2">
        <span className="label">{te.icon}</span>
        <div className="grid grid-cols-5 gap-2">
          {VEHICLE_ICONS.map((key) => (
            <button
              key={key}
              type="button"
              aria-label={t.icons[key]}
              aria-pressed={iconOf(v) === key}
              className={`flex aspect-square items-center justify-center rounded-lg border ${
                iconOf(v) === key
                  ? 'border-ink bg-ink text-canvas'
                  : 'border-line-strong bg-surface text-ink'
              }`}
              onClick={() => onPatch({ icon: key })}
            >
              <VehicleIcon icon={key} className="size-8" />
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <span className="label">{te.color}</span>
        <div className="grid grid-cols-7 gap-2">
          {VEHICLE_COLORS.map((c, n) => (
            <button
              key={c}
              type="button"
              aria-label={te.colorN(n + 1)}
              aria-pressed={v.color === c}
              className={`aspect-square rounded-lg ring-offset-2 ring-offset-surface ${
                v.color === c ? 'ring-3 ring-ink' : ''
              }`}
              style={{ background: c }}
              onClick={() => onPatch({ color: c })}
            />
          ))}
        </div>
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary w-12 px-0"
            aria-label={te.moveUp}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="btn btn-secondary w-12 px-0"
            aria-label={te.moveDown}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            ↓
          </button>
          <button
            type="button"
            className="btn btn-secondary ml-auto text-danger"
            disabled={count <= 1}
            onClick={onRemove}
          >
            {te.remove}
          </button>
        </div>
      )}
    </fieldset>
  );
}
