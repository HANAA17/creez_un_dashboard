import { addMonthsClamped, parseDate, toIso, type IsoDate } from '../domain';

export function dateToIso(d: Date): IsoDate {
  return toIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function isoToDate(iso: IsoDate): Date {
  const { y, m, d } = parseDate(iso);
  return new Date(y, m - 1, d);
}

/** "2026-10" -> "octobre 2026" */
export function monthLabel(month: string): string {
  return isoToDate(`${month}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export function shiftMonth(month: string, delta: number): string {
  return addMonthsClamped(`${month}-01`, delta).slice(0, 7);
}

/** "2026-10-25" -> "dimanche 25 octobre" */
export function dayLabel(iso: IsoDate): string {
  return isoToDate(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function shortDate(iso: IsoDate): string {
  return isoToDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
