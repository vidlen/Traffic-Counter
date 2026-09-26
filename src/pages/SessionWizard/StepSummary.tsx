import { useState } from 'react';
import { CheckRow } from '../../components/Form';
import { t } from '../../i18n/id';
import { clock } from '../../lib/clock';
import { buildSchedule, previewSchedule } from '../../lib/schedule';
import { ekrComplete, flowsOf } from '../../lib/session';
import { fmtDate, fmtDay, fmtDuration, fmtHm, fmtRange, localTime } from '../../lib/time';
import type { StepProps } from './index';

const tw = t.wizard;

function Section({ title, rows }: { title: string; rows: [string, string | undefined][] }) {
  return (
    <section className="space-y-2">
      <h2 className="label">{title}</h2>
      <dl className="card divide-y divide-line">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex gap-4 px-4 py-2.5">
              <dt className="w-32 shrink-0 text-sm text-muted">{k}</dt>
              <dd className="min-w-0 flex-1 font-medium break-words">{v}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}

export function StepSummary({ draft: d }: StepProps) {
  const [checks, setChecks] = useState(tw.checks.map(() => false));
  const counted = d.positions.filter((p) => d.countedKeys.includes(p.key));
  const flows = flowsOf(d);
  const sc = d.schedule;
  const p = previewSchedule(d.timerMode === 'MENERUS' ? buildSchedule(d, clock.now()) : []);

  const scheduleText =
    d.timerMode === 'MANUAL'
      ? tw.previewManual(d.manual?.maxIntervals)
      : sc.kind === 'BLOK'
        ? sc.blocks.map((b) => `${b.label} ${fmtHm(b.start)}-${fmtHm(b.end)}`).join(', ')
        : sc.count
          ? `${sc.count} × ${tw.minutes(d.intervalMin)}`
          : `${tw.until} ${fmtHm(sc.until ?? '')}`;

  return (
    <div className="space-y-6">
      {d.testMode && (
        <p className="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">
          {tw.testModeNote(d.testSpeed ?? 60)}
        </p>
      )}
      <Section
        title={tw.sInfo}
        rows={[
          [tw.location, d.location],
          [tw.project, d.project],
          [tw.date, `${fmtDay(localTime(d.date, 0))}, ${fmtDate(localTime(d.date, 0))}`],
          [tw.surveyor, d.surveyor],
          [tw.roadInfo, d.roadInfo],
          [tw.weather, d.weather],
          [tw.remarks, d.remarks],
        ]}
      />
      <Section
        title={tw.sPosition}
        rows={[
          [tw.surveyType, d.surveyType === 'RUAS' ? tw.ruas : tw.simpang],
          [tw.allPositions, d.positions.map((x) => x.label).join(', ')],
          [
            tw.counted,
            counted.map((x) => x.label).join(', ') +
              (d.surveyType === 'SIMPANG' ? ` (${flows.map((f) => f.label).join(', ')})` : ''),
          ],
        ]}
      />
      <Section
        title={tw.sClassification}
        rows={[
          [
            tw.template,
            `${d.classification.name}, ${t.classifications.types(d.classification.vehicleTypes.length)}`,
          ],
          [tw.ekrTitle, tw.ekrState(ekrComplete(d))],
        ]}
      />
      <Section
        title={tw.sTime}
        rows={[
          [tw.interval, tw.minutes(d.intervalMin)],
          [tw.timerMode, tw.modeText[d.timerMode === 'MANUAL' ? 'MANUAL' : sc.kind]],
          [tw.startKind, scheduleText],
          [tw.previewCount, p.count ? String(p.count) : undefined],
          [tw.previewFirst, p.first ? fmtRange(p.first.start, p.first.end, d.date) : undefined],
          [tw.previewLast, p.last ? fmtRange(p.last.start, p.last.end, d.date) : undefined],
          [tw.previewTotal, p.count ? fmtDuration(p.countedMs) : undefined],
        ]}
      />
      <section className="space-y-2">
        <h2 className="label">{tw.checklist}</h2>
        <div className="card px-4 py-1">
          {tw.checks.map((c, i) => (
            <CheckRow
              key={c}
              label={c}
              checked={checks[i]}
              onChange={(on) => setChecks((xs) => xs.map((x, j) => (j === i ? on : x)))}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
