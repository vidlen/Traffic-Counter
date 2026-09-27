import { useState } from 'react';
import { t } from '../i18n/id';
import { fmtEkr, parseDecimal } from '../lib/format';
import { fillEkrFromPkji } from '../lib/presets';
import type { PkjiClass, VehicleType } from '../types';
import { VehicleChip } from './VehicleChip';

const tw = t.wizard;
const HELPER_CLASSES: PkjiClass[] = ['SM', 'MP', 'KS', 'BB', 'TB'];

/**
 * Tabel ekr per jenis (koma desimal). Isian tidak valid tidak dikirim ke onChange.
 * Pasang `key` berbeda di induk bila daftar jenis diganti dari luar (mis. ganti template).
 */
export function EkrEditor({
  types,
  onChange,
}: {
  types: VehicleType[];
  onChange: (types: VehicleType[]) => void;
}) {
  const [texts, setTexts] = useState(() => types.map((v) => fmtEkr(v.ekr)));
  const [pkji, setPkji] = useState<Record<string, string>>({ MP: fmtEkr(1) });
  const showHelper = types.some((v) => v.pkji && v.pkji !== v.code);

  const edit = (i: number, text: string) => {
    setTexts((xs) => xs.map((x, j) => (j === i ? text : x)));
    const ekr = parseDecimal(text);
    if (ekr === null || ekr > 0) onChange(types.map((v, j) => (j === i ? { ...v, ekr } : v)));
  };

  const fill = () => {
    const values = Object.fromEntries(
      HELPER_CLASSES.map((c) => [c, parseDecimal(pkji[c] ?? '')]).filter(
        ([, v]) => typeof v === 'number' && v > 0,
      ),
    );
    const next = fillEkrFromPkji(types, values);
    setTexts(next.map((v) => fmtEkr(v.ekr)));
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {showHelper && (
        <div className="rounded-xl bg-sunken p-4">
          <p className="font-semibold">{tw.pkjiHelperTitle}</p>
          <p className="mt-0.5 text-sm text-ink-2">{tw.pkjiHelperHint}</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {HELPER_CLASSES.map((c) => (
              <label key={c} className="space-y-1 text-center">
                <span className="text-sm font-bold">{c}</span>
                <input
                  className="input px-1 text-center tabular-nums"
                  inputMode="decimal"
                  placeholder="-"
                  value={pkji[c] ?? ''}
                  onChange={(e) => setPkji((p) => ({ ...p, [c]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-secondary mt-3 w-full" onClick={fill}>
            {tw.pkjiFill}
          </button>
        </div>
      )}
      <ul className="card divide-y divide-line">
        {types.map((v, i) => {
          const bad = Number.isNaN(parseDecimal(texts[i] ?? '')) || parseDecimal(texts[i]) === 0;
          return (
            <li key={v.code} className="flex min-h-14 items-center gap-3 px-3 py-2">
              <VehicleChip v={v} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{v.name}</span>
              {v.inSkr ? (
                <input
                  aria-label={`ekr ${v.code}`}
                  className={`input w-24 text-center tabular-nums ${bad ? 'border-danger ring-2 ring-danger/30' : ''}`}
                  inputMode="decimal"
                  placeholder="-"
                  value={texts[i] ?? ''}
                  onChange={(e) => edit(i, e.target.value)}
                />
              ) : (
                <span className="w-24 text-center text-sm text-muted">{tw.notInSkr}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
