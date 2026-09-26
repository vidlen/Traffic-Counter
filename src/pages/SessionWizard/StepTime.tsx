import { CheckRow, Field, Segmented } from '../../components/Form';
import { t } from '../../i18n/id';
import { clock } from '../../lib/clock';
import {
  buildSchedule,
  DIVISORS_OF_60,
  INTERVAL_CHOICES,
  previewSchedule,
  validateTiming,
} from '../../lib/schedule';
import { fmtDuration, fmtRange } from '../../lib/time';
import type { Session, TimeBlock } from '../../types';
import type { StepProps } from './index';

const tw = t.wizard;

export function StepTime({ draft: d, patch, showErrors }: StepProps) {
  const sc = d.schedule;
  const errors = showErrors ? validateTiming(d) : [];
  const setBlocks = (blocks: TimeBlock[]) => patch({ schedule: { kind: 'BLOK', blocks } });
  const blocks = sc.kind === 'BLOK' ? sc.blocks : [];

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="label">{tw.interval}</h2>
        <Segmented
          label={tw.interval}
          value={d.intervalMin}
          options={INTERVAL_CHOICES.map((n) => [n, String(n)] as const)}
          onChange={(intervalMin) => patch({ intervalMin })}
        />
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">{tw.otherInterval}</span>
          <select
            className="input w-32"
            value={d.intervalMin}
            onChange={(e) => patch({ intervalMin: Number(e.target.value) })}
          >
            {DIVISORS_OF_60.map((n) => (
              <option key={n} value={n}>
                {tw.minutes(n)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="space-y-2">
        <h2 className="label">{tw.timerMode}</h2>
        <Segmented
          label={tw.timerMode}
          value={d.timerMode}
          options={[
            ['MENERUS', tw.menerus],
            ['MANUAL', tw.manual],
          ]}
          onChange={(timerMode) => patch({ timerMode })}
        />
        <p className="text-sm text-muted">
          {d.timerMode === 'MENERUS' ? tw.menerusHint : tw.manualHint}
        </p>
      </section>

      {d.timerMode === 'MENERUS' ? (
        <section className="space-y-3">
          <h2 className="label">{tw.startKind}</h2>
          <Segmented
            label={tw.startKind}
            value={sc.kind}
            options={[
              ['SEKARANG', tw.sekarang],
              ['BLOK', tw.blok],
            ]}
            onChange={(kind) =>
              kind !== sc.kind &&
              patch({
                schedule:
                  kind === 'BLOK'
                    ? { kind, blocks: structuredClone(tw.defaultBlocks) }
                    : { kind, alignToClock: true, count: 4 },
              })
            }
          />
          {sc.kind === 'SEKARANG' ? (
            <div className="card space-y-3 p-3">
              <CheckRow
                label={tw.alignToClock}
                hint={tw.alignHint}
                checked={sc.alignToClock}
                onChange={(alignToClock) => patch({ schedule: { ...sc, alignToClock } })}
              />
              <Segmented
                label={tw.endBy}
                value={sc.until !== undefined ? 'until' : 'count'}
                options={[
                  ['count', tw.endByCount],
                  ['until', tw.endByUntil],
                ]}
                onChange={(v) =>
                  patch({
                    schedule:
                      v === 'until'
                        ? { kind: 'SEKARANG', alignToClock: sc.alignToClock, until: '18:00' }
                        : { kind: 'SEKARANG', alignToClock: sc.alignToClock, count: 4 },
                  })
                }
              />
              {sc.until !== undefined ? (
                <Field label={tw.until}>
                  <input
                    type="time"
                    className="input"
                    value={sc.until}
                    onChange={(e) => patch({ schedule: { ...sc, until: e.target.value } })}
                  />
                </Field>
              ) : (
                <Field label={tw.count}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className="input tabular-nums"
                    value={sc.count || ''}
                    onChange={(e) =>
                      patch({ schedule: { ...sc, count: Number(e.target.value) || 0 } })
                    }
                  />
                </Field>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((b, i) => (
                <div key={i} className="card grid grid-cols-[1fr_auto] gap-2 p-3">
                  <input
                    aria-label={tw.blockName}
                    className="input font-semibold"
                    value={b.label}
                    onChange={(e) =>
                      setBlocks(
                        blocks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-secondary text-danger"
                    onClick={() => setBlocks(blocks.filter((_, j) => j !== i))}
                  >
                    {tw.removeBlock}
                  </button>
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <Field label={tw.blockStart}>
                      <input
                        type="time"
                        className="input"
                        value={b.start}
                        onChange={(e) =>
                          setBlocks(
                            blocks.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)),
                          )
                        }
                      />
                    </Field>
                    <Field label={tw.blockEnd}>
                      <input
                        type="time"
                        className="input"
                        value={b.end}
                        onChange={(e) =>
                          setBlocks(
                            blocks.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)),
                          )
                        }
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary w-full"
                onClick={() => {
                  const last = blocks[blocks.length - 1];
                  setBlocks([
                    ...blocks,
                    {
                      label: tw.newBlock(blocks.length + 1),
                      start: last?.end ?? '06:00',
                      end: last?.end ?? '07:00',
                    },
                  ]);
                }}
              >
                + {tw.addBlock}
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="card space-y-2 p-3">
          <Field label={tw.maxIntervals} hint={tw.maxIntervalsHint}>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              className="input tabular-nums"
              value={d.manual?.maxIntervals ?? ''}
              onChange={(e) =>
                patch({
                  manual: {
                    snapToClock: d.manual?.snapToClock ?? true,
                    maxIntervals: e.target.value === '' ? undefined : Number(e.target.value),
                  },
                })
              }
            />
          </Field>
          <CheckRow
            label={tw.snapToClock}
            hint={tw.snapHint}
            checked={d.manual?.snapToClock ?? true}
            onChange={(snapToClock) => patch({ manual: { ...d.manual, snapToClock } })}
          />
        </section>
      )}

      <Preview draft={d} />

      {errors.map((e) => (
        <p key={e} className="text-sm font-semibold text-danger">
          {e}
        </p>
      ))}
    </div>
  );
}

function Preview({ draft: d }: { draft: Session }) {
  if (d.timerMode === 'MANUAL') {
    return (
      <section className="card p-4">
        <h2 className="font-semibold">{tw.preview}</h2>
        <p className="mt-1 text-ink-2">{tw.previewManual(d.manual?.maxIntervals)}</p>
      </section>
    );
  }
  const p = previewSchedule(buildSchedule(d, clock.now()));
  const rows: [string, string][] = p.first
    ? [
        [tw.previewCount, String(p.count)],
        [tw.previewFirst, fmtRange(p.first.start, p.first.end, d.date)],
        [tw.previewLast, fmtRange(p.last!.start, p.last!.end, d.date)],
        [tw.previewTotal, fmtDuration(p.countedMs)],
      ]
    : [];
  return (
    <section className="card p-4">
      <h2 className="font-semibold">{tw.preview}</h2>
      {d.schedule.kind === 'SEKARANG' && <p className="text-sm text-muted">{tw.previewIfNow}</p>}
      {rows.length ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-sm text-muted">{k}</dt>
              <dd className="text-lg font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-1 text-ink-2">{tw.previewEmpty}</p>
      )}
    </section>
  );
}
