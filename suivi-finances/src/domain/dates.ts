import type { IsoDate } from './types';

export function parseDate(d: IsoDate): { y: number; m: number; d: number } {
  const [y, m, day] = d.split('-').map(Number) as [number, number, number];
  return { y, m, d: day };
}

export function toIso(y: number, m: number, d: number): IsoDate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Ajoute des mois en gardant le jour d'origine, ramené à la fin du mois si besoin (31 janv. + 1 mois = 28/29 févr.). */
export function addMonthsClamped(date: IsoDate, months: number, anchorDay = parseDate(date).d): IsoDate {
  const { y, m } = parseDate(date);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return toIso(ny, nm, Math.min(anchorDay, daysInMonth(ny, nm)));
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const { y, m, d } = parseDate(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return toIso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** "2026-10-25" -> "2026-10" : le mois budgétaire commence toujours le 1er. */
export function monthKey(date: IsoDate): string {
  return date.slice(0, 7);
}

export function monthsBetween(fromMonth: string, toMonth: string): number {
  const [fy, fm] = fromMonth.split('-').map(Number) as [number, number];
  const [ty, tm] = toMonth.split('-').map(Number) as [number, number];
  return (ty - fy) * 12 + (tm - fm);
}

/** Date du jour dans le fuseau du téléphone (et non en UTC). */
export function todayIso(now: Date = new Date()): IsoDate {
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
