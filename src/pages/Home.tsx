import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BrandMark } from '../components/BrandMark';
import { DeleteSessionDialog } from '../components/DeleteSessionDialog';
import { ExportDialog } from '../components/ExportDialog';
import { enterLandscape } from '../hooks/useDevice';
import { loadSettings, useSettings } from '../hooks/useSettings';
import { useStorageStatus } from '../hooks/useStorageStatus';
import { t } from '../i18n/id';
import { clock } from '../lib/clock';
import { db } from '../lib/db';
import { fmtNum } from '../lib/format';
import { duplicateSettings, isActive } from '../lib/session';
import { fmtDate, isoDate, localTime } from '../lib/time';
import { useUi, useWizard } from '../store';
import type { IntervalRecord, Session } from '../types';

const th = t.home;

interface Stats {
  intervals: number;
  vehicles: number;
}

function statsBySession(rows: IntervalRecord[]): Map<string, Stats> {
  const map = new Map<string, Stats>();
  for (const r of rows) {
    if (r.status === 'TERBUKA') continue;
    const s = map.get(r.sessionId) ?? { intervals: 0, vehicles: 0 };
    s.intervals += 1;
    for (const n of Object.values(r.counts)) s.vehicles += n;
    map.set(r.sessionId, s);
  }
  return map;
}

export function Home() {
  const navigate = useNavigate();
  const { updateReady, applyUpdate } = useUi();
  const setDraft = useWizard((s) => s.setDraft);
  const sessions = useLiveQuery(() => db.sessions.orderBy('createdAt').reverse().toArray());
  const stats = useLiveQuery(async () => statsBySession(await db.intervals.toArray()));
  const [toDelete, setToDelete] = useState<Session | null>(null);
  const [toExport, setToExport] = useState<Session | null>(null);

  const storage = useStorageStatus();
  const { lockLandscape } = useSettings();

  const active = sessions?.filter(isActive) ?? [];
  const drafts = sessions?.filter((s) => s.status === 'DRAFT') ?? [];
  const finished = sessions?.filter((s) => s.status === 'SELESAI') ?? [];
  const unexported = [...active, ...finished].some((s) => !s.exportedAt && stats?.get(s.id));

  const duplicate = async (s: Session) => {
    const now = clock.now();
    setDraft(duplicateSettings(s, await loadSettings(), crypto.randomUUID(), now, isoDate(now)));
    navigate('/sesi/baru');
  };

  const group = (title: string, list: Session[]) =>
    list.length > 0 && (
      <section className="mt-8 space-y-3">
        <h2 className="label">{title}</h2>
        <ul className="space-y-3">
          {list.map((s) => (
            <SessionCard
              key={s.id}
              s={s}
              stats={stats?.get(s.id)}
              onDuplicate={() => void duplicate(s)}
              onDelete={() => setToDelete(s)}
              onExport={() => setToExport(s)}
              onContinue={() => isActive(s) && lockLandscape && void enterLandscape()}
            />
          ))}
        </ul>
      </section>
    );

  return (
    <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        <BrandMark className="size-11" />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{t.app.name}</h1>
          <p className="truncate text-sm text-muted">{t.app.tagline}</p>
        </div>
      </header>

      {updateReady && active.length === 0 && (
        <div className="card mt-6 flex items-center justify-between gap-3 p-3 pl-4">
          <p className="font-medium">{t.pwa.updateReady}</p>
          <button className="btn btn-accent" onClick={applyUpdate}>
            {t.pwa.reload}
          </button>
        </div>
      )}

      {storage.nearlyFull ? (
        <p className="mt-6 rounded-xl bg-danger-soft p-4 text-sm font-semibold text-danger">
          {th.storageFull}
        </p>
      ) : (
        storage.persisted === false &&
        unexported && (
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-parsial p-4">
            <p className="flex-1 text-sm font-medium">{th.storageNotPersisted}</p>
            <button className="btn btn-secondary shrink-0" onClick={() => void storage.request()}>
              {th.storagePersist}
            </button>
          </div>
        )
      )}

      <Link to="/sesi/baru" className="btn btn-primary mt-6 h-16 w-full text-lg">
        <span className="text-2xl leading-none text-accent">+</span>
        {th.newSession}
      </Link>

      {sessions && sessions.length === 0 && (
        <section className="mt-8 rounded-xl border border-dashed border-line-strong px-5 py-8 text-center">
          <h2 className="font-semibold">{th.emptyTitle}</h2>
          <p className="mx-auto mt-1 max-w-[32ch] text-sm text-muted">{th.emptyBody}</p>
        </section>
      )}

      {group(th.active, active)}
      {group(th.drafts, drafts)}
      {group(th.finished, finished)}

      <nav className="card mt-10 divide-y divide-line">
        {[
          ['/klasifikasi', t.nav.classifications],
          ['/pengaturan', t.nav.settings],
          ['/panduan-install', t.nav.install],
        ].map(([to, label]) => (
          <Link key={to} to={to} className="flex min-h-14 items-center justify-between px-4">
            <span className="font-medium">{label}</span>
            <span aria-hidden="true" className="text-muted">
              ›
            </span>
          </Link>
        ))}
      </nav>

      {toDelete && (
        <DeleteSessionDialog
          key={toDelete.id}
          session={toDelete}
          onClose={() => setToDelete(null)}
        />
      )}
      {toExport && (
        <ExportDialog key={toExport.id} session={toExport} onClose={() => setToExport(null)} />
      )}
    </div>
  );
}

const STATUS_STYLE: Record<Session['status'], string> = {
  DRAFT: 'bg-sunken text-ink-2',
  MENUNGGU: 'bg-accent text-on-accent',
  BERJALAN: 'bg-ok text-canvas',
  SELESAI: 'bg-sunken text-ink-2',
};

function SessionCard({
  s,
  stats,
  onDuplicate,
  onDelete,
  onExport,
  onContinue,
}: {
  s: Session;
  stats?: Stats;
  onDuplicate: () => void;
  onDelete: () => void;
  onExport: () => void;
  onContinue: () => void;
}) {
  const [more, setMore] = useState(false);
  const counted = s.positions
    .filter((p) => s.countedKeys.includes(p.key))
    .map((p) => p.label)
    .join(', ');
  const primary =
    s.status === 'DRAFT'
      ? { to: `/sesi/${s.id}/edit`, label: th.continue }
      : isActive(s)
        ? { to: `/sesi/${s.id}`, label: th.continue }
        : { to: `/sesi/${s.id}/rekap`, label: th.recap };
  const notExported = s.status !== 'DRAFT' && !s.exportedAt && (stats?.intervals ?? 0) > 0;

  return (
    <li className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{s.location}</h3>
          <p className="truncate text-sm text-muted">
            {fmtDate(localTime(s.date, 0))}, {counted}
          </p>
        </div>
        <span className={`badge shrink-0 ${STATUS_STYLE[s.status]}`}>{th.status[s.status]}</span>
      </div>
      {(s.testMode || notExported || stats) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {stats && (
            <span className="text-sm font-medium tabular-nums">
              {th.intervals(stats.intervals)}, {th.vehicles(fmtNum(stats.vehicles))}
            </span>
          )}
          {notExported && <span className="badge bg-parsial text-ink">{th.notExported}</span>}
          {s.testMode && <span className="badge bg-danger-soft text-danger">{th.testBadge}</span>}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Link to={primary.to} className="btn btn-primary flex-1" onClick={onContinue}>
          {primary.label}
        </Link>
        <button
          className="btn btn-secondary w-12 px-0 text-xl"
          aria-label={th.more}
          aria-expanded={more}
          onClick={() => setMore((m) => !m)}
        >
          ⋯
        </button>
      </div>
      {more && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {s.status !== 'DRAFT' && primary.label !== th.recap && (
            <Link to={`/sesi/${s.id}/rekap`} className="btn btn-secondary">
              {th.recap}
            </Link>
          )}
          {s.status !== 'DRAFT' && (
            <button className="btn btn-secondary" onClick={onExport}>
              {th.export}
            </button>
          )}
          <button className="btn btn-secondary" onClick={onDuplicate}>
            {th.duplicate}
          </button>
          <button className="btn btn-secondary text-danger" onClick={onDelete}>
            {th.delete}
          </button>
        </div>
      )}
    </li>
  );
}
