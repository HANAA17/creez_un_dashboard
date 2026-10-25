import { addDays, addMonthsClamped } from './dates';
import type { IsoDate, RecurrenceRule, Transaction } from './types';

/** Date de la n-ième échéance (n = 0 pour la première), calculée depuis la date de départ pour éviter toute dérive. */
export function nthOccurrence(rule: RecurrenceRule, n: number): IsoDate {
  const step = n * rule.interval;
  switch (rule.frequency) {
    case 'weekly':
      return addDays(rule.startDate, step * 7);
    case 'monthly':
      return addMonthsClamped(rule.startDate, step);
    case 'yearly':
      return addMonthsClamped(rule.startDate, step * 12);
  }
}

/**
 * Échéances qui restent à créer : après `lastGenerated`, jusqu'à `upTo` inclus,
 * et pas au-delà de `endDate`. Le 31 de chaque mois tombe le dernier jour des mois courts.
 */
export function dueOccurrences(rule: RecurrenceRule, upTo: IsoDate): IsoDate[] {
  if (rule.interval < 1) return [];
  const limit = rule.endDate && rule.endDate < upTo ? rule.endDate : upTo;
  const dates: IsoDate[] = [];
  for (let n = 0; ; n++) {
    const d = nthOccurrence(rule, n);
    if (d > limit) break;
    if (!rule.lastGenerated || d > rule.lastGenerated) dates.push(d);
    if (n > 5000) break; // garde-fou
  }
  return dates;
}

/** Crée les transactions dues et retourne la règle mise à jour (id déterministe : pas de doublon possible). */
export function generateDue(
  rule: RecurrenceRule,
  upTo: IsoDate,
): { transactions: Transaction[]; rule: RecurrenceRule } {
  const dates = dueOccurrences(rule, upTo);
  const transactions = dates.map(
    (date) => ({ ...rule.template, id: `${rule.id}:${date}`, date, recurrenceId: rule.id }) as Transaction,
  );
  const last = dates[dates.length - 1];
  return { transactions, rule: last ? { ...rule, lastGenerated: last } : rule };
}

