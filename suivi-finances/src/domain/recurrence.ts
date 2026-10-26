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
  if (rule.interval < 1 || rule.paused) return [];
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


/**
 * Prochaine échéance pas encore créée (peut être dans le passé si l'app n'a pas encore été ouverte).
 * Retourne null si la règle est terminée (date de fin dépassée).
 */
export function nextOccurrence(rule: RecurrenceRule): IsoDate | null {
  if (rule.interval < 1) return null;
  for (let n = 0; n <= 5000; n++) {
    const d = nthOccurrence(rule, n);
    if (rule.endDate && d > rule.endDate) return null;
    if (!rule.lastGenerated || d > rule.lastGenerated) return d;
  }
  return null;
}

/** Une règle est terminée quand sa date de fin est passée et que toutes ses échéances sont créées. */
export function isFinished(rule: RecurrenceRule): boolean {
  return nextOccurrence(rule) === null;
}

/** Met en pause : plus aucune échéance n'est créée. */
export function pauseRule(rule: RecurrenceRule): RecurrenceRule {
  return { ...rule, paused: true };
}

/**
 * Reprend sans rattrapage : les échéances manquées pendant la pause sont ignorées,
 * la règle repart à la prochaine échéance à venir.
 */
export function resumeRule(rule: RecurrenceRule, today: IsoDate): RecurrenceRule {
  let last: IsoDate | undefined = rule.lastGenerated;
  for (let n = 0; n <= 5000; n++) {
    const d = nthOccurrence(rule, n);
    if (d > today) break;
    if (!last || d > last) last = d;
  }
  return { ...rule, paused: false, lastGenerated: last };
}

/** Les `count` prochaines dates à partir de `from` (incluse), pour prévisualiser une planification. */
export function upcomingOccurrences(rule: RecurrenceRule, from: IsoDate, count: number): IsoDate[] {
  const out: IsoDate[] = [];
  if (rule.interval < 1) return out;
  for (let n = 0; n <= 5000 && out.length < count; n++) {
    const d = nthOccurrence(rule, n);
    if (rule.endDate && d > rule.endDate) break;
    if (d >= from) out.push(d);
  }
  return out;
}
