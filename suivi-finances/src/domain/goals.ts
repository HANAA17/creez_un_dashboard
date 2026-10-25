import { monthKey, monthsBetween } from './dates';
import type { Cents, Goal, IsoDate, Transaction } from './types';

export interface GoalProgress {
  saved: Cents;
  remaining: Cents;
  /** 1 = 100 %. Peut dépasser 1 si l'objectif est dépassé. */
  ratio: number;
  reached: boolean;
  /** Versement mensuel conseillé ; null sans date cible, ou si l'objectif est atteint ou échu. */
  monthlyNeeded: Cents | null;
  overdue: boolean;
}

/**
 * Épargne d'un objectif = versements (type 'expense') − retraits (type 'income')
 * sur sa catégorie d'épargne. Le solde initial est un versement daté du jour de création.
 */
export function goalProgress(goal: Goal, txs: Transaction[], asOf: IsoDate): GoalProgress {
  const saved = txs.reduce((sum, tx) => {
    if (tx.type === 'transfer' || tx.categoryId !== goal.categoryId || tx.date > asOf) return sum;
    return sum + (tx.type === 'expense' ? tx.amount : -tx.amount);
  }, 0);

  const remaining = Math.max(0, goal.target - saved);
  const reached = saved >= goal.target;

  let monthlyNeeded: Cents | null = null;
  let overdue = false;
  if (!reached && goal.targetDate) {
    // Mois en cours inclus : de oct. à déc. = 3 versements possibles.
    const months = monthsBetween(monthKey(asOf), monthKey(goal.targetDate)) + 1;
    if (months < 1) overdue = true;
    else monthlyNeeded = Math.ceil(remaining / months);
  }

  return {
    saved,
    remaining,
    ratio: goal.target > 0 ? saved / goal.target : 0,
    reached,
    monthlyNeeded,
    overdue,
  };
}
