import { t } from '../../i18n/id';
import { validateTiming } from '../../lib/schedule';
import type { Session } from '../../types';

const tw = t.wizard;

export function positionErrors(d: Pick<Session, 'surveyType' | 'positions' | 'countedKeys'>) {
  const errors: string[] = [];
  if (d.positions.some((p) => !p.label.trim())) errors.push(tw.errLabel);
  if (d.surveyType === 'RUAS') {
    if (d.countedKeys.length < 1 || d.countedKeys.length > 2) errors.push(tw.errCountedRuas);
    return errors;
  }
  const arm = d.positions.find((p) => d.countedKeys.includes(p.key));
  if (d.countedKeys.length !== 1 || !arm) errors.push(tw.errCountedSimpang);
  else if (!arm.movements?.length) errors.push(tw.errMovements);
  return errors;
}

/** Kesalahan per langkah wizard (1-5); kosong = boleh lanjut. */
export function stepErrors(step: number, d: Session): string[] {
  switch (step) {
    case 1:
      return [d.location, d.surveyor, d.date].some((v) => !v.trim()) ? [tw.required] : [];
    case 2:
      return positionErrors(d);
    case 4:
      return validateTiming(d);
    default:
      return [];
  }
}
