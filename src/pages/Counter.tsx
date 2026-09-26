import { type CSSProperties, memo, useState, useSyncExternalStore } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { AppBar, Page } from '../components/AppBar';
import { HoldButton } from '../components/HoldButton';
import { Sheet } from '../components/Sheet';
import { useBeforeUnload } from '../hooks/useBeforeUnload';
import { useCounterSession } from '../hooks/useCounterSession';
import { useSettings } from '../hooks/useSettings';
import { useWakeLock, wakeLockSupported } from '../hooks/useWakeLock';
import { t } from '../i18n/id';
import { clock } from '../lib/clock';
import { fmtNum } from '../lib/format';
import { textOn } from '../lib/presets';
import { countKey, type Flow, isActive } from '../lib/session';
import { fmtClock, fmtCountdown, fmtRange, fmtTime } from '../lib/time';
import { useEngine } from '../store';
import type { ButtonSize, IntervalRecord, NoteCategory, Session, VehicleType } from '../types';

const tc = t.counter;
const BTN_H: Record<ButtonSize, string> = {
  NORMAL: '3.5rem',
  BESAR: '4.5rem',
  SANGAT_BESAR: '5.5rem',
};
const MOVE_ARROW: Record<string, string> = { LT: '↰', ST: '↑', RT: '↱', UT: '↶' };

const subscribeOrientation = (cb: () => void) => {
  const m = matchMedia('(orientation: portrait)');
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
const usePortrait = () =>
  useSyncExternalStore(subscribeOrientation, () => matchMedia('(orientation: portrait)').matches);

type Counter = ReturnType<typeof useCounterSession>;

export function Counter() {
  const { id = '' } = useParams();
  const c = useCounterSession(id);
  const s = c.session;
  const running = !!s && isActive(s);
  useWakeLock(running);
  useBeforeUnload(running);

  if (s === undefined) return <div className="h-[100dvh] bg-canvas" />;
  if (s === null)
    return (
      <>
        <AppBar title={tc.notFound} />
        <Page>{null}</Page>
      </>
    );
  if (s.status === 'DRAFT') return <Navigate to={`/sesi/${id}/edit`} replace />;
  if (s.status === 'SELESAI') return <Finished s={s} records={c.records ?? []} />;
  return <CountingScreen c={c} s={s} />;
}

function CountingScreen({ c, s }: { c: Counter; s: Session }) {
  const settings = useSettings();
  const portrait = usePortrait();
  const [sheet, setSheet] = useState<'menu' | 'note' | null>(null);
  const types = s.classification.vehicleTypes;
  const running = c.eng.phase === 'BERJALAN';
  const twoWayTall = s.surveyType === 'RUAS' && c.flows.length === 2 && types.length > 7;

  return (
    <div
      className="flex h-[100dvh] flex-col bg-canvas select-none [-webkit-touch-callout:none]"
      style={{ '--btn-h': BTN_H[settings.buttonSize] } as CSSProperties}
      onContextMenu={(e) => e.preventDefault()}
    >
      <CounterHeader s={s} c={c} onMenu={() => setSheet('menu')} />

      <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {c.eng.phase === 'MENUNGGU' && <Waiting s={s} c={c} />}
        {twoWayTall && portrait && (
          <p className="mb-2 rounded-lg bg-sunken px-3 py-2 text-sm font-medium">{tc.rotateHint}</p>
        )}
        {!wakeLockSupported && (
          <p className="mb-2 rounded-lg bg-parsial px-3 py-2 text-sm font-medium">
            {tc.wakeLockHint}
          </p>
        )}
        {s.surveyType === 'SIMPANG' ? (
          <SimpangGrid c={c} types={types} disabled={!running} />
        ) : (
          <RuasGrid
            c={c}
            types={types}
            disabled={!running}
            sub={
              c.flows.length === 1
                ? types.length > 7
                  ? 2
                  : 1
                : !portrait && types.length > 7
                  ? 2
                  : 1
            }
          />
        )}
      </main>

      {c.correction && (
        <p className="bg-danger px-3 py-1.5 text-center text-sm font-bold text-canvas">
          {tc.correctionOn}
        </p>
      )}
      <footer className="grid grid-cols-3 gap-2 border-t border-line bg-canvas px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <button
          className="btn btn-secondary h-14"
          disabled={!running}
          onClick={() => void c.undo()}
        >
          <span aria-hidden="true">↶</span> {tc.undo}
        </button>
        <button
          className={`btn h-14 ${c.correction ? 'btn-danger' : 'btn-secondary'}`}
          aria-pressed={c.correction}
          disabled={!running}
          onClick={() => c.setCorrection(!c.correction)}
        >
          <span aria-hidden="true">±</span> {tc.correction}
        </button>
        <button className="btn btn-secondary h-14" onClick={() => setSheet('note')}>
          <span aria-hidden="true">+</span> {tc.note}
        </button>
      </footer>

      <NoteSheet open={sheet === 'note'} onClose={() => setSheet(null)} onSave={c.note} />
      <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title={tc.menu}>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to={`/sesi/${s.id}/rekap`} className="btn btn-secondary">
            {tc.recap}
          </Link>
          <Link to="/" className="btn btn-secondary">
            {tc.home}
          </Link>
        </div>
        <p className="mt-6 mb-2 text-sm text-muted">{tc.finishHold}</p>
        <HoldButton
          label={tc.finish}
          onDone={() => {
            setSheet(null);
            void c.finish();
          }}
        />
      </Sheet>
    </div>
  );
}

function CounterHeader({ s, c, onMenu }: { s: Session; c: Counter; onMenu: () => void }) {
  const now = useEngine((x) => (x.tick?.sessionId === s.id ? x.tick.now : clock.now()));
  const e = c.eng;
  const where = c.flows.map((f) => f.label).join(', ');
  const progress =
    e.start !== undefined && e.end !== undefined ? (now - e.start) / (e.end - e.start) : 0;
  const waitingLabel =
    e.nextStart === undefined
      ? tc.waitingManual
      : e.nextBlock
        ? tc.waitingBlock(e.nextBlock)
        : tc.waitingStart;

  return (
    <header className="bg-[#17191b] px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2.5 text-[#f1f0eb]">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="font-semibold">{s.location}</span>
          <span className="text-[#f1f0eb]/65"> · {where}</span>
        </p>
        <p className="text-sm font-semibold tabular-nums">{fmtClock(now)}</p>
        <button
          className="-mr-1 flex size-10 items-center justify-center rounded-lg text-2xl active:bg-white/10"
          aria-label={tc.menu}
          onClick={onMenu}
        >
          ⋮
        </button>
      </div>
      {e.phase === 'BERJALAN' && e.start !== undefined && e.end !== undefined ? (
        <>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-[#f1f0eb]/75">
                {tc.intervalOf(e.index ?? 0, e.total)} · {fmtRange(e.start, e.end, s.date)}
              </p>
              <p className="text-4xl leading-none font-bold tabular-nums">
                {fmtCountdown(e.end - now)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#f1f0eb]/65">{tc.thisInterval}</p>
              <p className="text-2xl leading-none font-bold tabular-nums">
                {fmtNum(c.intervalTotal)}
                <span className="ml-1 text-sm font-medium text-[#f1f0eb]/65">{tc.kend}</span>
              </p>
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full origin-left rounded-full bg-[#f2b705]"
              style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }}
            />
          </div>
        </>
      ) : (
        <div className="mt-1">
          <p className="text-sm text-[#f1f0eb]/75">{waitingLabel}</p>
          <p className="text-4xl leading-none font-bold tabular-nums">
            {e.nextStart !== undefined ? fmtCountdown(e.nextStart - now) : '--:--'}
          </p>
        </div>
      )}
    </header>
  );
}

function Waiting({ s, c }: { s: Session; c: Counter }) {
  const e = c.eng;
  const alignedWait =
    e.nextStart !== undefined &&
    ((s.timerMode === 'MENERUS' && s.schedule.kind === 'SEKARANG' && !(c.records ?? []).length) ||
      s.timerMode === 'MANUAL');
  return (
    <section className="mb-2 rounded-xl border border-line bg-surface p-3">
      {e.nextStart !== undefined && (
        <p className="text-center font-semibold">{tc.startsAt(fmtTime(e.nextStart))}</p>
      )}
      {e.nextStart === undefined && s.timerMode === 'MANUAL' && (
        <button className="btn btn-accent h-16 w-full text-lg" onClick={() => void c.startNext()}>
          {tc.startNext}
        </button>
      )}
      {alignedWait && (
        <button className="btn btn-secondary mt-2 w-full" onClick={() => void c.startNow()}>
          {tc.startNow}
        </button>
      )}
    </section>
  );
}

const CounterButton = memo(function CounterButton({
  v,
  flowKey,
  flowLabel,
  count,
  total,
  disabled,
  correction,
  compact,
  onTap,
}: {
  v: VehicleType;
  flowKey: string;
  flowLabel: string;
  count: number;
  total: number;
  disabled: boolean;
  correction: boolean;
  compact?: boolean;
  onTap: (flowKey: string, code: string) => void;
}) {
  const fg = textOn(v.color);
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${v.code} ${flowLabel}: ${count}`}
      className="relative flex min-h-[var(--btn-h)] touch-manipulation flex-col justify-between overflow-hidden rounded-xl px-3 py-2 text-left transition-transform duration-75 active:scale-[0.97] active:brightness-90 disabled:opacity-30 disabled:saturate-0"
      style={{ background: v.color, color: fg }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        onTap(flowKey, v.code);
      }}
      onClick={(e) => e.detail === 0 && onTap(flowKey, v.code)} // keyboard
    >
      {correction && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl border-4 border-dashed border-white/90 bg-[repeating-linear-gradient(135deg,rgb(180_35_24/0.55)_0_10px,transparent_10px_20px)]"
        />
      )}
      {compact ? (
        <>
          <span className="relative text-sm leading-none font-bold">{v.code}</span>
          <span
            key={count}
            className="relative animate-bump text-center text-3xl leading-none font-bold tabular-nums"
          >
            {count}
          </span>
          <span className="relative text-right text-xs leading-none tabular-nums opacity-85">
            {fmtNum(total)}
          </span>
        </>
      ) : (
        <>
          <span className="relative flex items-start justify-between gap-2">
            <span className="text-xl leading-none font-bold">{v.code}</span>
            <span key={count} className="animate-bump text-3xl leading-none font-bold tabular-nums">
              {count}
            </span>
          </span>
          <span className="relative flex items-end justify-between gap-2 text-xs leading-tight opacity-90">
            <span className="truncate">{v.name}</span>
            <span className="shrink-0 tabular-nums">Σ {fmtNum(total)}</span>
          </span>
        </>
      )}
    </button>
  );
});

function RuasGrid({
  c,
  types,
  disabled,
  sub,
}: {
  c: Counter;
  types: VehicleType[];
  disabled: boolean;
  sub: number;
}) {
  return (
    <div
      className="grid min-h-full gap-2"
      style={{ gridTemplateColumns: `repeat(${c.flows.length}, minmax(0, 1fr))` }}
    >
      {c.flows.map((f) => (
        <section key={f.key} className="flex min-w-0 flex-col gap-2">
          {c.flows.length > 1 && (
            <h2 className="truncate text-center text-sm font-bold">{f.label}</h2>
          )}
          <div
            className="grid flex-1 gap-2"
            style={{
              gridTemplateColumns: `repeat(${sub}, minmax(0, 1fr))`,
              gridAutoRows: 'minmax(var(--btn-h), 1fr)',
            }}
          >
            {types.map((v) => (
              <Cell key={v.code} c={c} f={f} v={v} disabled={disabled} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SimpangGrid({
  c,
  types,
  disabled,
}: {
  c: Counter;
  types: VehicleType[];
  disabled: boolean;
}) {
  return (
    <div
      className="grid min-h-full gap-2"
      style={{
        gridTemplateColumns: `repeat(${c.flows.length}, minmax(0, 1fr))`,
        gridTemplateRows: `auto repeat(${types.length}, minmax(var(--btn-h), 1fr))`,
      }}
    >
      {c.flows.map((f) => (
        <div
          key={f.key}
          className="sticky top-0 z-10 bg-canvas py-1 text-center text-lg leading-tight font-extrabold"
        >
          {f.label} <span aria-hidden="true">{MOVE_ARROW[f.movement ?? '']}</span>
        </div>
      ))}
      {types.map((v) =>
        c.flows.map((f) => (
          <Cell key={f.key + v.code} c={c} f={f} v={v} disabled={disabled} compact />
        )),
      )}
    </div>
  );
}

function Cell({
  c,
  f,
  v,
  disabled,
  compact,
}: {
  c: Counter;
  f: Flow;
  v: VehicleType;
  disabled: boolean;
  compact?: boolean;
}) {
  const key = countKey(f.positionKey, f.movement, v.code);
  return (
    <CounterButton
      v={v}
      flowKey={f.key}
      flowLabel={f.label}
      count={c.counts[key] ?? 0}
      total={c.sessionTotal(key)}
      disabled={disabled}
      correction={c.correction}
      compact={compact}
      onTap={c.tap}
    />
  );
}

const NOTE_ORDER: NoteCategory[] = [
  'HUJAN_RINGAN',
  'HUJAN_DERAS',
  'KECELAKAAN',
  'MACET',
  'APILL_MATI',
  'DIATUR_PETUGAS',
  'ACARA',
  'LAINNYA',
];

function NoteSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (category: NoteCategory, text?: string) => Promise<void>;
}) {
  const [other, setOther] = useState<string | null>(null);
  const close = () => {
    setOther(null);
    onClose();
  };
  return (
    <Sheet open={open} onClose={close} title={t.notes.title}>
      <p className="mt-1 text-sm text-muted">{t.notes.hint}</p>
      {other === null ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {NOTE_ORDER.map((cat) => (
            <button
              key={cat}
              className="btn btn-secondary h-14"
              onClick={() => {
                if (cat === 'LAINNYA') return setOther('');
                void onSave(cat);
                close();
              }}
            >
              {t.notes.categories[cat]}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!other.trim()) return;
            void onSave('LAINNYA', other.trim());
            close();
          }}
        >
          <label className="block space-y-1.5">
            <span className="label">{t.notes.otherLabel}</span>
            <input
              className="input"
              autoFocus
              value={other}
              onChange={(e) => setOther(e.target.value)}
            />
          </label>
          <button className="btn btn-primary w-full" disabled={!other.trim()}>
            {t.notes.save}
          </button>
        </form>
      )}
    </Sheet>
  );
}

function Finished({ s, records }: { s: Session; records: IntervalRecord[] }) {
  const closed = records.filter((r) => r.status !== 'TERBUKA');
  const vehicles = closed.reduce(
    (a, r) => a + Object.values(r.counts).reduce((x, y) => x + y, 0),
    0,
  );
  return (
    <>
      <AppBar title={s.location} />
      <Page>
        <section className="card p-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{tc.finishedTitle}</h2>
          <p className="mt-2 text-ink-2">{tc.finishedBody(closed.length, fmtNum(vehicles))}</p>
        </section>
        <div className="grid gap-2">
          <Link to={`/sesi/${s.id}/rekap`} className="btn btn-primary h-14">
            {tc.recap}
          </Link>
          <Link to="/" className="btn btn-secondary">
            {tc.home}
          </Link>
        </div>
      </Page>
    </>
  );
}
