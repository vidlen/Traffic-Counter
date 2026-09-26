import { textOn } from '../lib/presets';

export function VehicleChip({ code, color }: { code: string; color: string }) {
  return (
    <span
      className="inline-flex min-w-9 items-center justify-center rounded-lg px-2 py-1 text-sm font-bold"
      style={{ background: color, color: textOn(color) }}
    >
      {code || '?'}
    </span>
  );
}
