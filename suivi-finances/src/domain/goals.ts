import { monthKey, monthsBetween } from './dates';
import { envelopeBalance, type EnvelopeData } from './envelopes';
import type { Cents, Goal, IsoDate } from './types';

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

/** Épargne d'un objectif = solde de son enveloppe d'épargne (argent réparti − dépenses faites sur cet objectif). */
export function goalProgress(goal: Goal, d: EnvelopeData, asOf: IsoDate): GoalProgress {
  const saved = envelopeBalance(goal.categoryId, d, asOf);
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
    saved: Math.max(0, saved),
    remaining,
    ratio: goal.target > 0 ? Math.max(0, saved) / goal.target : 0,
    reached,
    monthlyNeeded,
    overdue,
  };
}
