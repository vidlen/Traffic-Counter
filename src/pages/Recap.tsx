import { useLiveQuery } from 'dexie-react-hooks';
import { lazy, type ReactNode, Suspense, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { AppBar, Page } from '../components/AppBar';
import { EkrEditor } from '../components/EkrEditor';
import { ExportDialog } from '../components/ExportDialog';
import { Segmented } from '../components/Form';
import { VehicleChip } from '../components/VehicleChip';
import { useSettings } from '../hooks/useSettings';
import { t } from '../i18n/id';
import {
  type Basis,
  composition,
  type IntervalRow,
  peaks,
  recap,
  turnRatios,
  typeTotals,
  type WindowRow,
} from '../lib/aggregate';
import { db } from '../lib/db';
import { fmtNum } from '../lib/format';
import { ekrComplete, isActive } from '../lib/session';
import { updateEkr } from '../lib/sessionActions';
import { fmtDate, fmtRange, fmtTime, localTime } from '../lib/time';
import { toast } from '../store';
import type { IntervalStatus, NoteEvent, Session } from '../types';

const RecapChart = lazy(() => import('../components/RecapChart'));

const tr = t.recap;
type Tab = 'interval' | 'hour' | 'chart' | 'notes';
type Recap = ReturnType<typeof recap>;

const STATUS_BG: Record<IntervalStatus, string> = {
  TERBUKA: '',
  LENGKAP: '',
  PARSIAL: 'bg-parsial',
  TERPUTUS: 'bg-terputus',
  TERLEWAT: 'bg-terlewat',
};

const num = (v: number | null | undefined) => (v === null || v === undefined ? '' : fmtNum(v));
const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? '' : `${fmtNum(v, 1)}%`;

export function Recap() {
  const { id = '' } = useParams();
  const session = useLiveQuery(() => db.sessions.get(id).then((x) => x ?? null), [id]);
  const intervals = useLiveQuery(() => db.intervals.where('sessionId').equals(id).toArray(), [id]);
  const notes = useLiveQuery(() => db.notes.where('sessionId').equals(id).sortBy('t'), [id]);
  const { peakPeriods } = useSettings();
  const [tab, setTab] = useState<Tab>('interval');
  const [basisPref, setBasis] = useState<Basis | null>(null);
  const [exporting, setExporting] = useState(false);

  const r = useMemo(
    () =>
      session && intervals && notes
        ? recap(session, intervals, notes, peakPeriods, basisPref ?? 'skr')
        : null,
    [session, intervals, notes, peakPeriods, basisPref],
  );

  if (session === null)
    return (
      <>
        <AppBar title={tr.title} />
        <Page>
          <p className="text-muted">{t.counter.notFound}</p>
        </Page>
      </>
    );
  if (!session || !r || !notes) return <AppBar title={tr.title} />;

  const complete = ekrComplete(session);

  return (
    <>
      <AppBar title={tr.title} backTo={isActive(session) ? `/sesi/${session.id}` : '/'} />
      <Page>
        <header>
          <h2 className="text-xl font-semibold tracking-tight">{session.location}</h2>
          <p className="text-sm text-muted">
            {fmtDate(localTime(session.date, 0))}, {r.flows.map((f) => f.label).join(', ')},{' '}
            {t.wizard.minutes(session.intervalMin)}
          </p>
        </header>

        <div className="space-y-3">
          <Segmented<Tab>
            label={tr.title}
            value={tab}
            options={(['interval', 'hour', 'chart', 'notes'] as const).map(
              (k) => [k, tr.tabs[k]] as const,
            )}
            onChange={setTab}
          />
          {tab !== 'notes' && (
            <div className="flex items-center justify-between gap-3">
              <span className="label">{tr.unit}</span>
              <div className="w-44">
                <Segmented<Basis>
                  label={tr.unit}
                  value={r.basis}
                  options={[
                    ['kend', tr.kend],
                    ['skr', tr.skr],
                  ]}
                  onChange={(b) => (b === 'kend' || complete) && setBasis(b)}
                />
              </div>
            </div>
          )}
        </div>

        <EkrPanel session={session} complete={complete} />

        {r.rows.length === 0 && tab !== 'notes' ? (
          <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-muted">
            {tr.empty}
          </p>
        ) : tab === 'interval' ? (
          <IntervalTable r={r} s={session} />
        ) : tab === 'hour' ? (
          <HourTab r={r} s={session} />
        ) : tab === 'chart' ? (
          <Suspense fallback={<div className="card h-80 animate-pulse bg-sunken" />}>
            <RecapChart rows={r.rows} flows={r.flows} types={r.types} basis={r.basis} />
          </Suspense>
        ) : (
          <NotesTab s={session} rows={r.rows} notes={notes} />
        )}
        <div className="h-16" />
      </Page>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          className="btn btn-primary mx-auto flex w-full max-w-xl"
          onClick={() => setExporting(true)}
        >
          {tr.export}
        </button>
      </div>
      {exporting && (
        <ExportDialog key={session.id} session={session} onClose={() => setExporting(false)} />
      )}
    </>
  );
}

function EkrPanel({ session, complete }: { session: Session; complete: boolean }) {
  const [open, setOpen] = useState(false);
  if (complete && !open)
    return (
      <button className="btn btn-secondary w-full" onClick={() => setOpen(true)}>
        {tr.ekrEdit}
      </button>
    );
  return (
    <section className="space-y-2">
      {!complete && (
        <p className="rounded-xl bg-parsial p-3 text-sm font-medium">{tr.ekrMissing}</p>
      )}
      <EkrEditor
        key={session.id}
        types={session.classification.vehicleTypes}
        onChange={(types) => void updateEkr(session.id, types)}
      />
      {complete && (
        <button
          className="btn btn-secondary w-full"
          onClick={() => {
            setOpen(false);
            toast(tr.ekrSaved);
          }}
        >
          {tr.ekrDone}
        </button>
      )}
    </section>
  );
}

function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-max text-sm tabular-nums">
        <thead className="bg-sunken text-left text-ink-2">{head}</thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

const th = 'px-3 py-2 font-semibold whitespace-nowrap';
const td = 'px-3 py-2 whitespace-nowrap';

function IntervalTable({ r, s }: { r: Recap; s: Session }) {
  const [showTypes, setShowTypes] = useState(false);
  const b = r.basis;
  const multi = r.flows.length > 1;
  return (
    <section className="space-y-3">
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className="size-5 accent-ink"
          checked={showTypes}
          onChange={(e) => setShowTypes(e.target.checked)}
        />
        <span className="font-medium">{tr.showTypes}</span>
      </label>
      <Table
        head={
          <tr>
            <th className={th}>{tr.no}</th>
            <th className={th}>{tr.time}</th>
            {showTypes &&
              r.types.map((v) => (
                <th key={v.code} className={th}>
                  {v.code}
                </th>
              ))}
            {r.flows.map((f) => (
              <th key={f.key} className={th}>
                {f.label}
              </th>
            ))}
            {multi && <th className={th}>{tr.total}</th>}
            <th className={th}>{tr.status}</th>
          </tr>
        }
      >
        {r.rows.map((row) => (
          <tr key={row.index} className={STATUS_BG[row.status]}>
            <td className={td}>{row.index}</td>
            <td className={td}>{fmtRange(row.start, row.end, s.date)}</td>
            {showTypes &&
              r.types.map((v) => (
                <td key={v.code} className={`${td} text-right`}>
                  {num(row.total.byType[v.code])}
                </td>
              ))}
            {r.flows.map((f) => (
              <td key={f.key} className={`${td} text-right`}>
                {num(row.byFlow[f.key][b])}
              </td>
            ))}
            {multi && <td className={`${td} text-right font-semibold`}>{num(row.total[b])}</td>}
            <td className={td}>
              {tr.statusName[row.status]}
              {row.notes.length > 0 && (
                <span className="badge ml-2 bg-ink text-canvas">{tr.hasNote}</span>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </section>
  );
}

function WindowTable({
  rows,
  r,
  title,
  withMax,
}: {
  rows: WindowRow[];
  r: Recap;
  title: string;
  withMax?: boolean;
}) {
  const b = r.basis;
  const multi = r.flows.length > 1;
  return (
    <section className="space-y-2">
      <h2 className="label">{title}</h2>
      <Table
        head={
          <tr>
            <th className={th}>{tr.range}</th>
            {r.flows.map((f) => (
              <th key={f.key} className={th}>
                {f.label}
              </th>
            ))}
            {multi && <th className={th}>{tr.total}</th>}
            {withMax && <th className={th}>{tr.vMax}</th>}
            <th className={th}>{tr.valid}</th>
          </tr>
        }
      >
        {rows.map((w) => (
          <tr key={w.start} className={w.valid ? '' : 'text-muted'}>
            <td className={td}>{w.label}</td>
            {r.flows.map((f) => (
              <td key={f.key} className={`${td} text-right`}>
                {num(w.byFlow[f.key][b])}
              </td>
            ))}
            {multi && <td className={`${td} text-right font-semibold`}>{num(w.total[b])}</td>}
            {withMax && <td className={`${td} text-right`}>{num(w.vMax[b])}</td>}
            <td className={td}>{w.valid ? tr.yes : tr.no_}</td>
          </tr>
        ))}
      </Table>
    </section>
  );
}

function HourTab({ r, s }: { r: Recap; s: Session }) {
  const b = r.basis;
  const overallSkr =
    s.surveyType === 'SIMPANG' && ekrComplete(s)
      ? peaks(s.intervalMin === 60 ? r.hours : r.moves, [], 'skr', s.intervalMin).at(-1)?.win
      : undefined;
  const ratios = overallSkr ? turnRatios(overallSkr, r.flows) : null;

  return (
    <div className="space-y-8">
      <WindowTable rows={r.hours} r={r} title={tr.hourly} />
      {r.moves.length > 0 && <WindowTable rows={r.moves} r={r} title={tr.moving} withMax />}

      <section className="space-y-2">
        <h2 className="label">{tr.peak}</h2>
        <p className="text-sm text-muted">{tr.peakBasis(tr[b])}</p>
        <ul className="grid gap-2">
          {r.peaks.map((p) => (
            <li key={p.label} className="card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold">{p.label}</h3>
                <span className="font-semibold tabular-nums">{p.win?.label ?? ''}</span>
              </div>
              {p.win ? (
                <>
                  <div className="mt-2 flex items-baseline justify-between gap-3 tabular-nums">
                    <span className="text-2xl font-bold">
                      {num(p.win.total[b])}
                      <span className="ml-1 text-sm font-medium text-muted">{tr[b]}</span>
                    </span>
                    {p.phf !== null && (
                      <span className="text-sm">
                        {tr.phf(s.intervalMin)}{' '}
                        <strong className="text-base">{fmtNum(p.phf, 3)}</strong>
                      </span>
                    )}
                  </div>
                  {r.flows.length > 1 && (
                    <p className="mt-1 text-sm text-ink-2 tabular-nums">
                      {r.flows.map((f) => `${f.label} ${num(p.win!.byFlow[f.key][b])}`).join(', ')}
                    </p>
                  )}
                  {p.incomplete && (
                    <p className="mt-1 text-sm font-semibold text-danger">{tr.incomplete}</p>
                  )}
                  <Composition
                    values={composition(typeTotals(p.win.rows, r.types), r.types)}
                    r={r}
                  />
                </>
              ) : (
                <p className="mt-1 text-sm text-muted">{tr.noPeak}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="label">{tr.composition}</h2>
        <Table
          head={
            <tr>
              <th className={th}></th>
              {r.types.map((v) => (
                <th key={v.code} className={th}>
                  {v.code}
                </th>
              ))}
            </tr>
          }
        >
          {[
            ...r.flows.map((f) => [f.label, typeTotals(r.rows, r.types, f.key)] as const),
            ...(r.flows.length > 1 ? [[tr.total, typeTotals(r.rows, r.types)] as const] : []),
          ].map(([label, totals]) => {
            const c = composition(totals, r.types);
            return (
              <tr key={label}>
                <td className={`${td} font-semibold`}>{label}</td>
                {r.types.map((v) => (
                  <td key={v.code} className={`${td} text-right`}>
                    {pct(c[v.code])}
                  </td>
                ))}
              </tr>
            );
          })}
        </Table>
      </section>

      {s.surveyType === 'SIMPANG' && (
        <section className="space-y-2">
          <h2 className="label">{tr.turnRatio}</h2>
          {ratios && overallSkr ? (
            <div className="card grid grid-cols-3 gap-3 p-4 tabular-nums">
              <div>
                <p className="text-sm text-muted">{tr.range}</p>
                <p className="font-semibold">{overallSkr.label}</p>
              </div>
              <div>
                <p className="text-sm text-muted">pLT</p>
                <p className="text-xl font-bold">
                  {ratios.LT === null ? '' : fmtNum(ratios.LT, 3)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted">pRT</p>
                <p className="text-xl font-bold">
                  {ratios.RT === null ? '' : fmtNum(ratios.RT, 3)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">{tr.turnNoSkr}</p>
          )}
        </section>
      )}
    </div>
  );
}

function Composition({ values, r }: { values: Record<string, number | null>; r: Recap }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
      {r.types
        .filter((v) => values[v.code])
        .map((v) => (
          <span key={v.code} className="flex items-center gap-1.5 text-sm tabular-nums">
            <VehicleChip code={v.code} color={v.color} />
            {pct(values[v.code])}
          </span>
        ))}
    </div>
  );
}

function NotesTab({ s, rows, notes }: { s: Session; rows: IntervalRow[]; notes: NoteEvent[] }) {
  const indexOf = (ms: number) => rows.find((r) => ms >= r.start && ms < r.end)?.index;
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="label">{t.notes.title}</h2>
        {notes.length ? (
          <ul className="card divide-y divide-line">
            {notes.map((n) => (
              <li key={n.id} className="flex gap-3 px-4 py-3">
                <span className="w-14 shrink-0 font-semibold tabular-nums">{fmtTime(n.t)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{t.notes.categories[n.category]}</span>
                  {n.text && <span className="block text-sm text-ink-2">{n.text}</span>}
                </span>
                {indexOf(n.t) && (
                  <span className="text-sm text-muted tabular-nums">
                    {t.counter.intervalOf(indexOf(n.t)!)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{tr.notesEmpty}</p>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="label">{tr.gapsTitle}</h2>
        {s.gaps.length ? (
          <ul className="card divide-y divide-line">
            {s.gaps.map((g) => (
              <li key={g.from} className="flex justify-between gap-3 px-4 py-3 tabular-nums">
                <span className="font-medium">{fmtRange(g.from, g.to, s.date)}</span>
                <span className="text-muted">
                  {tr.minutes(fmtNum((g.to - g.from) / 60_000, 1))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{tr.gapsEmpty}</p>
        )}
      </section>
    </div>
  );
}
