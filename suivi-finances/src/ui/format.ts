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

/** "2026-10" -> "oct" */
export function shortMonth(month: string): string {
  return isoToDate(`${month}-01`).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
}

/** « chaque mois », « tous les 2 mois »… */
export function frequencyLabel(frequency: 'weekly' | 'monthly' | 'yearly', interval: number): string {
  const one = { weekly: 'chaque semaine', monthly: 'chaque mois', yearly: 'chaque année' }[frequency];
  if (interval <= 1) return one;
  const unit = { weekly: 'semaines', monthly: 'mois', yearly: 'ans' }[frequency];
  return `tous les ${interval} ${unit}`;
}
