import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  type ChartConfiguration,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
} from 'chart.js';
import { t } from '../../i18n/id';
import type { recap } from '../aggregate';
import { FLOW_COLORS } from '../session';
import { fmtTime } from '../time';

Chart.register(
  LineController,
  BarController,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Legend,
  Title,
);

const INK = '#17191b';
const W = 1600;
const H = 800;
const font = { size: 22 };

// Latar putih (PNG transparan tampil hitam di sebagian viewer).
const whiteBackground = {
  id: 'whiteBackground',
  beforeDraw(c: Chart) {
    c.ctx.save();
    c.ctx.fillStyle = '#ffffff';
    c.ctx.fillRect(0, 0, c.width, c.height);
    c.ctx.restore();
  },
};

/** Chart.js di <canvas> tersembunyi → PNG base64 (tanpa prefix data:). */
function render(config: ChartConfiguration): string {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.style.cssText = `position:fixed;left:-10000px;top:0;width:${W}px;height:${H}px`;
  document.body.append(canvas);
  try {
    const chart = new Chart(canvas, {
      ...config,
      options: {
        ...config.options,
        locale: 'id-ID', // 1.200 dan 1,25
        responsive: false,
        animation: false,
        devicePixelRatio: 1,
      },
      plugins: [whiteBackground],
    } as ChartConfiguration);
    const url = canvas.toDataURL('image/png');
    chart.destroy();
    return url.slice(url.indexOf(',') + 1);
  } finally {
    canvas.remove();
  }
}

const axes = (yTitle: string, stacked = false) => ({
  x: { stacked, ticks: { color: INK, font, maxRotation: 0, autoSkipPadding: 16 } },
  y: {
    stacked,
    beginAtZero: true,
    ticks: { color: INK, font },
    title: { display: true, text: yTitle, color: INK, font },
  },
});

export function renderCharts(r: ReturnType<typeof recap>): { line: string; bar: string } {
  const basis = r.basis;
  const multi = r.flows.length > 1;
  const color = (i: number) => FLOW_COLORS[i % FLOW_COLORS.length];
  const plugins = (text: string) => ({
    title: { display: true, text, color: INK, font: { size: 28, weight: 'bold' as const } },
    legend: { labels: { color: INK, font } },
  });

  const line = render({
    type: 'line',
    data: {
      labels: r.rows.map((row) => fmtTime(row.start)),
      datasets: [
        ...r.flows.map((f, i) => ({
          label: f.label,
          data: r.rows.map((row) => row.byFlow[f.key][basis]),
          borderColor: color(i),
          backgroundColor: color(i),
          borderWidth: 3,
          pointRadius: 3,
        })),
        ...(multi
          ? [
              {
                label: t.recap.total,
                data: r.rows.map((row) => row.total[basis]),
                borderColor: INK,
                backgroundColor: INK,
                borderWidth: 5,
                pointRadius: 4,
              },
            ]
          : []),
      ],
    },
    // Garis putus di interval TERLEWAT (spanGaps default false).
    options: { plugins: plugins(t.excel.chart.line(basis)), scales: axes(basis) },
  });

  const bar = render({
    type: 'bar',
    data: {
      labels: r.hours.map((h) => h.label),
      datasets: r.flows.map((f, i) => ({
        label: f.label,
        data: r.hours.map((h) => h.byFlow[f.key][basis]),
        backgroundColor: color(i),
      })),
    },
    options: { plugins: plugins(t.excel.chart.bar(basis)), scales: axes(basis, true) },
  });

  return { line, bar };
}
