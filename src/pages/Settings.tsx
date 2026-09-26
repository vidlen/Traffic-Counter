import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { AppBar, Page } from '../components/AppBar';
import { Field, Segmented, Switch } from '../components/Form';
import { saveSettings, useSettings } from '../hooks/useSettings';
import { useStorageStatus } from '../hooks/useStorageStatus';
import { t } from '../i18n/id';
import { db } from '../lib/db';
import { fmtNum } from '../lib/format';
import { PRESETS } from '../lib/presets';
import { DIVISORS_OF_60 } from '../lib/schedule';
import type { AppSettings, ButtonSize, PeakPeriod } from '../types';

const ts = t.settings;

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="label">{title}</h2>
      <div className="card divide-y divide-line px-4">{children}</div>
    </section>
  );
}

const mb = (bytes: number) => `${fmtNum(bytes / 1024 / 1024, 1)} MB`;

export function Settings() {
  const s = useSettings();
  const templates = useLiveQuery(() => db.templates.toArray()) ?? PRESETS;
  const storage = useStorageStatus();
  const set = (patch: Partial<AppSettings>) => void saveSettings(patch);
  const setPeak = (i: number, p: Partial<PeakPeriod>) =>
    set({ peakPeriods: s.peakPeriods.map((x, j) => (j === i ? { ...x, ...p } : x)) });

  return (
    <>
      <AppBar title={ts.title} />
      <Page>
        <section className="space-y-2">
          <h2 className="label">{ts.display}</h2>
          <div className="card space-y-4 p-4">
            <div className="space-y-2">
              <p className="font-medium">{ts.buttonSize}</p>
              <Segmented<ButtonSize>
                label={ts.buttonSize}
                value={s.buttonSize}
                options={(['NORMAL', 'BESAR', 'SANGAT_BESAR'] as const).map(
                  (k) => [k, ts.sizes[k]] as const,
                )}
                onChange={(buttonSize) => set({ buttonSize })}
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium">{ts.theme}</p>
              <Segmented
                label={ts.theme}
                value={s.theme}
                options={[
                  ['TERANG', ts.themes.TERANG],
                  ['GELAP', ts.themes.GELAP],
                ]}
                onChange={(theme) => set({ theme })}
              />
            </div>
            <div className="divide-y divide-line border-t border-line">
              <Switch
                label={ts.lockLandscape}
                hint={ts.lockLandscapeHint}
                checked={s.lockLandscape}
                onChange={(lockLandscape) => set({ lockLandscape })}
              />
              <Switch
                label={ts.vibration}
                hint={ts.vibrationHint}
                checked={s.vibration}
                onChange={(vibration) => set({ vibration })}
              />
              <Switch
                label={ts.sound}
                hint={ts.soundHint}
                checked={s.sound}
                onChange={(sound) => set({ sound })}
              />
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="label">{ts.defaults}</h2>
          <div className="card grid grid-cols-2 gap-3 p-4">
            <Field label={ts.defaultInterval}>
              <select
                className="input"
                value={s.defaultIntervalMin}
                onChange={(e) => set({ defaultIntervalMin: Number(e.target.value) })}
              >
                {DIVISORS_OF_60.map((n) => (
                  <option key={n} value={n}>
                    {t.wizard.minutes(n)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={ts.defaultTemplate}>
              <select
                className="input"
                value={s.defaultTemplateId}
                onChange={(e) => set({ defaultTemplateId: e.target.value })}
              >
                {templates.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="label">{ts.peak}</h2>
          <p className="text-sm text-muted">{ts.peakHint}</p>
          <ul className="space-y-2">
            {s.peakPeriods.map((p, i) => (
              <li key={i} className="card grid grid-cols-[1fr_6.5rem_6.5rem] gap-2 p-3">
                <input
                  aria-label={ts.peakName}
                  className="input font-semibold"
                  value={p.label}
                  onChange={(e) => setPeak(i, { label: e.target.value })}
                />
                <input
                  type="time"
                  aria-label={`${p.label} ${t.wizard.blockStart}`}
                  className="input px-2"
                  value={p.start}
                  onChange={(e) => setPeak(i, { start: e.target.value })}
                />
                <input
                  type="time"
                  aria-label={`${p.label} ${t.wizard.blockEnd}`}
                  className="input px-2"
                  value={p.end}
                  onChange={(e) => setPeak(i, { end: e.target.value })}
                />
              </li>
            ))}
          </ul>
        </section>

        <Group title={ts.storage}>
          <div className="space-y-1 py-3">
            <p className="font-medium">{ts.persisted}</p>
            <p className="text-sm text-ink-2">
              {storage.persisted === undefined
                ? ts.persistedUnknown
                : storage.persisted
                  ? ts.persistedYes
                  : ts.persistedNo}
            </p>
            {storage.quota !== undefined && (
              <p className="text-sm text-muted tabular-nums">
                {ts.usage(mb(storage.usage ?? 0), mb(storage.quota))}
              </p>
            )}
            {storage.persisted === false && (
              <button
                className="btn btn-secondary mt-2 w-full"
                onClick={() => void storage.request()}
              >
                {ts.requestPersist}
              </button>
            )}
          </div>
        </Group>

        <section className="space-y-2">
          <h2 className="label">{ts.advanced}</h2>
          <div className="card space-y-3 px-4 pb-4">
            <Switch
              label={ts.testMode}
              hint={ts.testModeHint}
              checked={s.testMode}
              onChange={(testMode) => set({ testMode })}
            />
            {s.testMode && (
              <div className="space-y-2">
                <p className="font-medium">{ts.testSpeed}</p>
                <Segmented
                  label={ts.testSpeed}
                  value={s.testSpeed}
                  options={[
                    [10, '×10'],
                    [60, '×60'],
                  ]}
                  onChange={(testSpeed) => set({ testSpeed })}
                />
              </div>
            )}
          </div>
        </section>

        <Group title={ts.about}>
          <div className="flex min-h-14 items-center justify-between">
            <span className="font-medium">{ts.version}</span>
            <span className="text-muted tabular-nums">{__APP_VERSION__}</span>
          </div>
        </Group>
      </Page>
    </>
  );
}
