import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { t } from '../i18n/id';
import { type Basis, recap } from '../lib/aggregate';
import { clock } from '../lib/clock';
import { db } from '../lib/db';
import { ekrComplete } from '../lib/session';
import { toast } from '../store';
import type { Session } from '../types';
import { CheckRow, Segmented } from './Form';

const te = t.exportDialog;

/** Buat file Excel (ExcelJS + Chart.js dimuat dinamis), lalu Bagikan / Unduh. Pasang `key` di induk. */
export function ExportDialog({ session, onClose }: { session: Session; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { peakPeriods } = useSettings();
  const complete = ekrComplete(session);
  const [includeLog, setIncludeLog] = useState(true);
  const [basis, setBasis] = useState<Basis>(complete ? 'skr' : 'kend');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => ref.current?.showModal(), []);

  const change = (fn: () => void) => {
    fn();
    setFile(null); // opsi berubah → buat ulang
  };

  const build = async () => {
    setBusy(true);
    try {
      const id = session.id;
      const [intervals, notes, events, excel, charts] = await Promise.all([
        db.intervals.where('sessionId').equals(id).toArray(),
        db.notes.where('sessionId').equals(id).toArray(),
        includeLog ? db.events.where('sessionId').equals(id).toArray() : [],
        import('../lib/excel/buildWorkbook'),
        import('../lib/excel/chartImage'),
      ]);
      const r = recap(session, intervals, notes, peakPeriods, basis);
      const blob = await excel.exportXlsx({
        session,
        intervals,
        notes,
        events,
        periods: peakPeriods,
        basis,
        includeLog,
        appVersion: __APP_VERSION__,
        exportedAt: clock.now(),
        charts: r.rows.length ? charts.renderCharts(r) : undefined,
      });
      setFile(new File([blob], excel.fileName(session), { type: excel.XLSX_MIME }));
    } catch {
      toast(te.failed, 'danger');
    } finally {
      setBusy(false);
    }
  };

  const markExported = async () => {
    await db.sessions.update(session.id, { exportedAt: clock.now() });
    toast(te.done);
  };

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: file.name });
      await markExported();
    } catch {
      // Dibatalkan pengguna / aplikasi tujuan gagal: file tetap bisa diunduh.
    }
  };

  const download = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    void markExported();
  };

  const canShare = !!file && !!navigator.canShare?.({ files: [file] });

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-xl bg-surface p-5 text-ink backdrop:bg-ink/60"
    >
      <h2 className="text-lg font-semibold">{te.title}</h2>
      <p className="mt-1 text-sm text-muted">{session.location}</p>

      <div className="mt-4 space-y-3">
        <CheckRow
          label={te.includeLog}
          hint={te.includeLogHint}
          checked={includeLog}
          onChange={(on) => change(() => setIncludeLog(on))}
        />
        <div className="space-y-1.5">
          <p className="label">{te.basis}</p>
          <Segmented<Basis>
            label={te.basis}
            value={basis}
            options={[
              ['kend', t.recap.kend],
              ['skr', t.recap.skr],
            ]}
            onChange={(b) => (b === 'kend' || complete) && change(() => setBasis(b))}
          />
          {!complete && <p className="text-sm text-muted">{te.basisHint}</p>}
        </div>
      </div>

      {file ? (
        <div className="mt-5 space-y-2">
          <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm font-medium break-all text-ink">
            {te.ready}: {file.name}
          </p>
          <div className="flex gap-2">
            {canShare && (
              <button className="btn btn-accent flex-1" onClick={() => void share()}>
                {te.share}
              </button>
            )}
            <button className="btn btn-primary flex-1" onClick={download}>
              {te.download}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-primary mt-5 w-full"
          disabled={busy}
          onClick={() => void build()}
        >
          {busy ? te.building : te.build}
        </button>
      )}
      <button className="btn btn-ghost mt-2 w-full" onClick={() => ref.current?.close()}>
        {te.close}
      </button>
    </dialog>
  );
}
