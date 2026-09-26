import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { t } from '../i18n/id';
import type { Basis, IntervalRow } from '../lib/aggregate';
import { skrOf } from '../lib/aggregate';
import { type Flow, FLOW_COLORS } from '../lib/session';
import { fmtTime } from '../lib/time';
import type { VehicleType } from '../types';
import { VehicleChip } from './VehicleChip';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const tr = t.recap;

/** Volume satu baris untuk jenis terpilih (null = kosong). */
function pickVol(
  byType: Record<string, number | null>,
  types: VehicleType[],
  basis: Basis,
): number | null {
  if (types.every((v) => byType[v.code] === null)) return null;
  if (basis === 'kend') return types.reduce((a, v) => a + (byType[v.code] ?? 0), 0);
  return skrOf(byType, types);
}

export default function RecapChart({
  rows,
  flows,
  types,
  basis,
}: {
  rows: IntervalRow[];
  flows: Flow[];
  types: VehicleType[];
  basis: Basis;
}) {
  const [selected, setSelected] = useState<string[]>(() => types.map((v) => v.code));
  const chosen = types.filter((v) => selected.includes(v.code));
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--c-ink').trim();
  const muted = getComputedStyle(document.documentElement).getPropertyValue('--c-muted').trim();
  const withNote = rows.map((r) => r.notes.length > 0);

  const data = {
    labels: rows.map((r) => fmtTime(r.start)),
    datasets: [
      ...flows.map((f, i) => ({
        label: f.label,
        data: rows.map((r) => pickVol(r.byFlow[f.key].byType, chosen, basis)),
        borderColor: FLOW_COLORS[i % FLOW_COLORS.length],
        backgroundColor: FLOW_COLORS[i % FLOW_COLORS.length],
        borderWidth: 2,
        pointRadius: 2,
      })),
      ...(flows.length > 1
        ? [
            {
              label: tr.total,
              data: rows.map((r) => pickVol(r.total.byType, chosen, basis)),
              borderColor: ink,
              backgroundColor: ink,
              borderWidth: 3,
              pointRadius: withNote.map((n) => (n ? 7 : 2)),
              pointStyle: withNote.map((n) => (n ? 'triangle' : 'circle')),
            },
          ]
        : []),
    ],
  };
  if (flows.length === 1) {
    const ds = data.datasets[0];
    Object.assign(ds, {
      pointRadius: withNote.map((n) => (n ? 7 : 2)),
      pointStyle: withNote.map((n) => (n ? 'triangle' : 'circle')),
    });
  }

  const toggle = (code: string) =>
    setSelected((xs) => (xs.includes(code) ? xs.filter((x) => x !== code) : [...xs, code]));

  return (
    <div className="space-y-4">
      <div className="card h-80 p-2">
        <Line
          data={data}
          options={{
            locale: 'id-ID',
            maintainAspectRatio: false,
            animation: false,
            spanGaps: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { labels: { color: ink, boxWidth: 12 } } },
            scales: {
              x: { ticks: { color: muted, maxRotation: 0, autoSkipPadding: 12 } },
              y: {
                beginAtZero: true,
                ticks: { color: muted },
                title: { display: true, text: tr[basis], color: muted },
              },
            },
          }}
        />
      </div>
      <p className="text-sm text-muted">{tr.chartNote}</p>
      <section className="space-y-2">
        <h2 className="label">{tr.chartTypes}</h2>
        <div className="flex flex-wrap gap-2">
          {types.map((v) => (
            <button
              key={v.code}
              type="button"
              aria-pressed={selected.includes(v.code)}
              onClick={() => toggle(v.code)}
              className={`rounded-lg transition-opacity ${selected.includes(v.code) ? '' : 'opacity-30'}`}
            >
              <VehicleChip code={v.code} color={v.color} />
            </button>
          ))}
          <button
            type="button"
            className="btn btn-secondary min-h-9 px-3 text-sm"
            onClick={() => setSelected(types.map((v) => v.code))}
          >
            {tr.chartAll}
          </button>
        </div>
      </section>
    </div>
  );
}
