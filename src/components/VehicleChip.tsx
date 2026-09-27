import { iconOf, textOn } from '../lib/presets';
import type { VehicleType } from '../types';
import { VehicleIcon } from './VehicleIcon';

export function VehicleChip({ v }: { v: Pick<VehicleType, 'code' | 'color' | 'icon' | 'pkji'> }) {
  return (
    <span
      className="inline-flex min-w-9 items-center justify-center gap-1 rounded-lg px-2 py-1 text-sm font-bold"
      style={{ background: v.color, color: textOn(v.color) }}
    >
      <VehicleIcon icon={iconOf(v)} className="size-4" />
      {v.code || '?'}
    </span>
  );
}
