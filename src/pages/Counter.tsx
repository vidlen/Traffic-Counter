import { type CSSProperties, memo, type ReactNode, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { AppBar, Page } from '../components/AppBar';
import { ExportDialog } from '../components/ExportDialog';
import { HoldButton } from '../components/HoldButton';
import { Sheet } from '../components/Sheet';
import { useBeforeUnload } from '../hooks/useBeforeUnload';
import { useCounterSession } from '../hooks/useCounterSession';
import {
  canLockLandscape,
  enterLandscape,
  exitLandscape,
  useBattery,
  usePortrait,
} from '../hooks/useDevice';
import { useSettings } from '../hooks/useSettings';
import { useWakeLock, wakeLockSupported } from '../hooks/useWakeLock';
import { t } from '../i18n/id';
import { clock } from '../lib/clock';
import { fmtNum } from '../lib/format';
import { textOn } from '../lib/presets';
import { countKey, type Flow, isActive } from '../lib/session';
import { fmtClock, fmtCountdown, fmtRange, fmtTime } from '../lib/time';
import { toast, useEngine } from '../store';
import type { ButtonSize, IntervalRecord, NoteCategory, Session, VehicleType } from '../types';

const tc = t.counter;
const BTN_H: Record<ButtonSize, string> = {
  NORMAL: '3.5rem',
  BESAR: '4.5rem',
  SANGAT_BESAR: '5.5rem',
};
const MOVE_ARROW: Record<string, string> = { LT: '↰', ST: '↑', RT: '↱', UT: '↶' };

type Counter = ReturnType<typeof useCounterSession>;

export function Counter() {
  const { id = '' } = useParams();
  const c = useCounterSession(id);
  const s = c.session;
  const running = !!s && isActive(s);
  useWakeLock(running);
  useBeforeUnload(running);
  useEffect(() => exitLandscape, []); // lepas layar penuh/landscape saat keluar layar hitung

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
  const [hideRotate, setHideRotate] = useState(false);
  const types = s.classification.vehicleTypes;
  const running = c.eng.phase === 'BERJALAN';
  const openMenu = () => setSheet('menu');
  // Saran sekali saja (bukan overlay) supaya tidak menutupi tombol hitung.
  useEffect(() => {
    if (!wakeLockSupported) toast(tc.wakeLockHint);
  }, []);

  const controls = [
    <button
      key="undo"
      className="btn btn-secondary h-full min-h-14 flex-col gap-0 px-1"
      disabled={!running}
      onClick={() => void c.undo()}
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        ↶
      </span>
      <span className="text-sm">{tc.undo}</span>
    </button>,
    <button
      key="kor"
      className={`btn h-full min-h-14 flex-col gap-0 px-1 ${c.correction ? 'btn-danger' : 'btn-secondary'}`}
      aria-pressed={c.correction}
      disabled={!running}
      onClick={() => c.setCorrection(!c.correction)}
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        ±
      </span>
      <span className="text-sm">{tc.correction}</span>
    </button>,
    <button
      key="note"
      className="btn btn-secondary h-full min-h-14 flex-col gap-0 px-1"
      onClick={() => setSheet('note')}
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        +
      </span>
      <span className="text-sm">{tc.note}</span>
    </button>,
  ];

  return (
    <div
      className="flex h-[100dvh] flex-col bg-canvas pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] select-none [-webkit-touch-callout:none]"
      style={{ '--btn-h': BTN_H[settings.buttonSize] } as CSSProperties}
      onContextMenu={(e) => e.preventDefault()}
    >
      {portrait ? (
        <>
          <CounterHeader s={s} c={c} onMenu={openMenu} />
          <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {!hideRotate && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-sunken py-1.5 pr-1.5 pl-3">
                <p className="flex-1 text-sm font-medium">{tc.rotateHint}</p>
                {canLockLandscape && (
                  <button
                    className="btn btn-primary min-h-10 px-3 text-sm"
                    onClick={() => void enterLandscape()}
                  >
                    {tc.goLandscape}
                  </button>
                )}
                <button
                  className="btn btn-ghost min-h-10 w-10 px-0"
                  aria-label={tc.dismiss}
                  onClick={() => setHideRotate(true)}
                >
                  ×
                </button>
              </div>
            )}
            {c.eng.phase === 'MENUNGGU' && <Waiting s={s} c={c} />}
            {s.surveyType === 'SIMPANG' ? (
              <SimpangGrid c={c} types={types} disabled={!running} />
            ) : (
              <RuasGrid
                c={c}
                types={types}
                disabled={!running}
                sub={c.flows.length === 1 && types.length > 7 ? 2 : 1}
              />
            )}
          </main>
          {c.correction && <CorrectionBar />}
          <footer className="grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-3 gap-2 border-t border-line bg-canvas px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            {controls}
          </footer>
        </>
      ) : (
        <>
          <LandscapeBar s={s} c={c} onMenu={openMenu} />
          {c.correction && <CorrectionBar />}
          <main
            className="relative grid min-h-0 flex-1 gap-1.5 p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]"
            style={{
              gridTemplateColumns:
                s.surveyType === 'RUAS' && c.flows.length === 2
                  ? 'minmax(0,1fr) 4.75rem minmax(0,1fr)'
                  : 'minmax(0,1fr) 4.75rem',
              gridTemplateRows: 'minmax(0,1fr)', // tinggi pasti → baris tombol dibagi rata
            }}
          >
            {s.surveyType === 'SIMPANG' ? (
              <SimpangLandscape c={c} types={types} disabled={!running} />
            ) : (
              <LandscapePanel c={c} f={c.flows[0]} types={types} disabled={!running} />
            )}
            <div className="grid grid-rows-3 gap-1.5">{controls}</div>
            {s.surveyType === 'RUAS' && c.flows.length === 2 && (
              <LandscapePanel c={c} f={c.flows[1]} types={types} disabled={!running} mirror />
            )}
            {c.eng.phase === 'MENUNGGU' && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
                <div className="pointer-events-auto w-full max-w-sm">
                  <Waiting s={s} c={c} />
                </div>
              </div>
            )}
          </main>
        </>
      )}

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

const CorrectionBar = () => (
  <p className="bg-danger px-3 py-1 text-center text-sm font-bold text-canvas">{tc.correctionOn}</p>
);

const TestBadge = () => (
  <span className="badge shrink-0 bg-danger text-canvas">{tc.testBanner}</span>
);

function useHeaderInfo(s: Session, c: Counter) {
  // Selektor harus mengembalikan nilai stabil (bukan clock.now()) supaya tidak render berulang.
  const tickNow = useEngine((x) => (x.tick?.sessionId === s.id ? x.tick.now : null));
  const now = tickNow ?? clock.now();
  const e = c.eng;
  const running = e.phase === 'BERJALAN' && e.start !== undefined && e.end !== undefined;
  return {
    now,
    running,
    progress: running ? (now - e.start!) / (e.end! - e.start!) : 0,
    countdown: running
      ? fmtCountdown(e.end! - now)
      : e.nextStart !== undefined
        ? fmtCountdown(e.nextStart - now)
        : '--:--',
    label: running
      ? `${tc.intervalOf(e.index ?? 0, e.total)} · ${fmtRange(e.start!, e.end!, s.date)}`
      : e.nextStart === undefined
        ? tc.waitingManual
        : e.nextBlock
          ? tc.waitingBlock(e.nextBlock)
          : tc.waitingStart,
  };
}

const MenuButton = ({ onMenu }: { onMenu: () => void }) => (
  <button
    className="flex size-10 shrink-0 items-center justify-center rounded-lg text-2xl active:bg-white/10"
    aria-label={tc.menu}
    onClick={onMenu}
  >
    ⋮
  </button>
);

const Progress = ({ value }: { value: number }) => (
  <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
    <div
      className="h-full origin-left rounded-full bg-[#f2b705]"
      style={{ transform: `scaleX(${Math.min(1, Math.max(0, value))})` }}
    />
  </div>
);

/** Header portrait: lokasi, jam HP, interval, hitung mundur, total interval. */
function CounterHeader({ s, c, onMenu }: { s: Session; c: Counter; onMenu: () => void }) {
  const h = useHeaderInfo(s, c);
  return (
    <header className="bg-[#17191b] px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2.5 text-[#f1f0eb]">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="font-semibold">{s.location}</span>
          <span className="text-[#f1f0eb]/65"> · {c.flows.map((f) => f.label).join(', ')}</span>
        </p>
        {s.testMode && <TestBadge />}
        <p className="text-sm font-semibold tabular-nums">{fmtClock(h.now)}</p>
        <MenuButton onMenu={onMenu} />
      </div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-[#f1f0eb]/75">{h.label}</p>
          <p className="text-4xl leading-none font-bold tabular-nums">{h.countdown}</p>
        </div>
        {h.running && (
          <div className="text-right">
            <p className="text-xs text-[#f1f0eb]/65">{tc.thisInterval}</p>
            <p className="text-2xl leading-none font-bold tabular-nums">
              {fmtNum(c.intervalTotal)}
              <span className="ml-1 text-sm font-medium text-[#f1f0eb]/65">{tc.kend}</span>
            </p>
          </div>
        )}
      </div>
      {h.running && (
        <div className="mt-2">
          <Progress value={h.progress} />
        </div>
      )}
    </header>
  );
}

/** Bar tipis landscape: semua info di satu baris supaya tombol mendapat tinggi maksimal. */
function LandscapeBar({ s, c, onMenu }: { s: Session; c: Counter; onMenu: () => void }) {
  const h = useHeaderInfo(s, c);
  const battery = useBattery();
  return (
    <header className="bg-[#17191b] pt-[env(safe-area-inset-top)] text-[#f1f0eb]">
      <div className="flex h-11 items-center gap-3 pr-3 pl-1">
        <MenuButton onMenu={onMenu} />
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="font-semibold">{s.location}</span>
          <span className="text-[#f1f0eb]/70"> · {h.label}</span>
        </p>
        {s.testMode && <TestBadge />}
        <p className="text-2xl leading-none font-bold tabular-nums">{h.countdown}</p>
        {h.running && (
          <p className="text-sm tabular-nums">
            <span className="text-lg font-bold">{fmtNum(c.intervalTotal)}</span>{' '}
            <span className="text-[#f1f0eb]/65">{tc.kend}</span>
          </p>
        )}
        {battery !== null && (
          <p className="text-sm text-[#f1f0eb]/80 tabular-nums">{tc.battery(battery)}</p>
        )}
        <p className="text-sm font-semibold tabular-nums">{fmtClock(h.now)}</p>
      </div>
      <Progress value={h.progress} />
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
    <section className="mb-2 rounded-xl border border-line bg-surface p-3 shadow-[0_12px_32px_rgb(23_25_27/0.18)]">
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

type Variant = 'wide' | 'big' | 'compact';

const CounterButton = memo(function CounterButton({
  v,
  flowKey,
  flowLabel,
  count,
  total,
  disabled,
  correction,
  variant = 'wide',
  mirror,
  onTap,
}: {
  v: VehicleType;
  flowKey: string;
  flowLabel: string;
  count: number;
  total: number;
  disabled: boolean;
  correction: boolean;
  variant?: Variant;
  mirror?: boolean; // sisi kanan landscape: angka di sisi dalam (kiri)
  onTap: (flowKey: string, code: string) => void;
}) {
  const row = mirror ? 'flex-row-reverse' : '';
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${v.code} ${flowLabel}: ${count}`}
      className="relative flex h-full min-h-[var(--btn-h)] w-full touch-manipulation flex-col justify-between overflow-hidden rounded-xl px-3 py-2 text-left transition-transform duration-75 active:scale-[0.97] active:brightness-90 disabled:opacity-30 disabled:saturate-0"
      style={{ background: v.color, color: textOn(v.color) }}
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
      {variant === 'compact' ? (
        <>
          {/* Dua baris saja (kode + total, lalu angka) supaya muat di tombol kecil 56 px. */}
          <span
            className={`relative flex items-baseline justify-between gap-1 leading-none ${row}`}
          >
            <span className="text-sm font-bold">{v.code}</span>
            <span className="text-xs tabular-nums opacity-85">{fmtNum(total)}</span>
          </span>
          <span
            key={count}
            className="relative animate-bump text-center text-3xl leading-none font-bold tabular-nums"
          >
            {count}
          </span>
        </>
      ) : (
        <>
          <span className={`relative flex items-start justify-between gap-2 ${row}`}>
            <span
              className={`leading-none font-bold ${variant === 'big' ? 'text-2xl' : 'text-xl'}`}
            >
              {v.code}
            </span>
            <span
              key={count}
              className={`animate-bump leading-none font-bold tabular-nums ${variant === 'big' ? 'text-5xl' : 'text-3xl'}`}
            >
              {count}
            </span>
          </span>
          <span
            className={`relative flex items-end justify-between gap-2 text-xs leading-tight opacity-90 ${row}`}
          >
            <span className="truncate">{v.name}</span>
            <span className="shrink-0 tabular-nums">Σ {fmtNum(total)}</span>
          </span>
        </>
      )}
    </button>
  );
});

function Cell({
  c,
  f,
  v,
  disabled,
  variant,
  mirror,
}: {
  c: Counter;
  f: Flow;
  v: VehicleType;
  disabled: boolean;
  variant?: Variant;
  mirror?: boolean;
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
      variant={variant}
      mirror={mirror}
      onTap={c.tap}
    />
  );
}

/**
 * Landscape ruas (satu arah per panel, panel kanan dicerminkan):
 * jenis lain = tombol kecil di atas; dua jenis pertama (paling sering, mis. SM & MP) =
 * tombol besar di bawah, SM paling bawah (dekat ibu jari).
 */
function LandscapePanel({
  c,
  f,
  types,
  disabled,
  mirror,
}: {
  c: Counter;
  f: Flow;
  types: VehicleType[];
  disabled: boolean;
  mirror?: boolean;
}) {
  const small = types.slice(2);
  const big = types.slice(0, 2).reverse(); // jenis pertama paling bawah
  const perRow = c.flows.length === 2 ? 5 : 8;
  const smallRows = Math.ceil(small.length / perRow);
  const cols = smallRows ? Math.ceil(small.length / smallRows) : 1;
  const rows = [
    'auto',
    ...Array.from({ length: smallRows }, () => 'minmax(var(--btn-h),1fr)'),
    ...big.map((_, i) => `minmax(var(--btn-h),${i === big.length - 1 ? 1.9 : 1.5}fr)`),
  ].join(' ');
  return (
    <section className="grid min-h-0 min-w-0 gap-1.5" style={{ gridTemplateRows: rows }}>
      <h2 className={`truncate px-1 text-sm leading-tight font-bold ${mirror ? 'text-right' : ''}`}>
        {f.label}
      </h2>
      {smallRows > 0 && (
        <div
          className={`grid gap-1.5 ${mirror ? '[direction:rtl]' : ''}`}
          style={{
            gridRow: `span ${smallRows}`,
            gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
            gridTemplateRows: `repeat(${smallRows}, minmax(0,1fr))`,
          }}
        >
          {small.map((v) => (
            <div key={v.code} className="min-w-0 [direction:ltr]">
              <Cell c={c} f={f} v={v} disabled={disabled} variant="compact" mirror={mirror} />
            </div>
          ))}
        </div>
      )}
      {big.map((v) => (
        <Cell key={v.code} c={c} f={f} v={v} disabled={disabled} variant="big" mirror={mirror} />
      ))}
    </section>
  );
}

/** Landscape simpang: baris = gerakan, kolom = jenis (dua jenis pertama lebih lebar). */
function SimpangLandscape({
  c,
  types,
  disabled,
}: {
  c: Counter;
  types: VehicleType[];
  disabled: boolean;
}) {
  const widths = types.map((_, i) => (i === 0 ? '1.6fr' : i === 1 ? '1.35fr' : '1fr'));
  return (
    <div
      className="grid min-h-0 min-w-0 gap-1.5"
      style={{
        gridTemplateColumns: `2.5rem ${widths.map((w) => `minmax(0,${w})`).join(' ')}`,
        gridTemplateRows: `repeat(${c.flows.length}, minmax(var(--btn-h),1fr))`,
      }}
    >
      {c.flows.map((f) => (
        <Row key={f.key} label={f.label} arrow={MOVE_ARROW[f.movement ?? '']}>
          {types.map((v) => (
            <Cell key={v.code} c={c} f={f} v={v} disabled={disabled} variant="compact" />
          ))}
        </Row>
      ))}
    </div>
  );
}

function Row({ label, arrow, children }: { label: string; arrow: string; children: ReactNode }) {
  return (
    <>
      <div className="flex flex-col items-center justify-center rounded-xl bg-sunken leading-none font-extrabold">
        <span className="text-base">{label}</span>
        <span aria-hidden="true" className="mt-1 text-lg">
          {arrow}
        </span>
      </div>
      {children}
    </>
  );
}

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
          <Cell key={f.key + v.code} c={c} f={f} v={v} disabled={disabled} variant="compact" />
        )),
      )}
    </div>
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
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
  const [exporting, setExporting] = useState(false);
  useEffect(exitLandscape, []);
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
          <button className="btn btn-accent h-14" onClick={() => setExporting(true)}>
            {tc.exportExcel}
          </button>
          <Link to={`/sesi/${s.id}/rekap`} className="btn btn-primary h-14">
            {tc.recap}
          </Link>
          <Link to="/" className="btn btn-secondary">
            {tc.home}
          </Link>
        </div>
      </Page>
      {exporting && <ExportDialog key={s.id} session={s} onClose={() => setExporting(false)} />}
    </>
  );
}
