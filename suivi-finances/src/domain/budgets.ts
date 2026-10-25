import { monthKey } from './dates';
import type { Budget, Category, Cents, IsoDate, Transaction } from './types';

export type BudgetLevel = 'ok' | 'warning' | 'exceeded';

export interface BudgetStatus {
  budget: Budget;
  spent: Cents;
  remaining: Cents;
  ratio: number;
  level: BudgetLevel;
}

export const WARNING_THRESHOLD = 0.8;

/** Une catégorie et ses sous-catégories. */
function withChildren(categoryId: string, categories: Category[]): Set<string> {
  const ids = new Set([categoryId]);
  for (const c of categories) if (c.parentId === categoryId) ids.add(c.id);
  return ids;
}

export function spentInMonth(
  categoryId: string,
  month: string,
  txs: Transaction[],
  categories: Category[],
  asOf: IsoDate,
): Cents {
  const ids = withChildren(categoryId, categories);
  return txs.reduce((sum, tx) => {
    if (tx.type !== 'expense' || !ids.has(tx.categoryId)) return sum;
    if (monthKey(tx.date) !== month || tx.date > asOf) return sum;
    return sum + tx.amount;
  }, 0);
}

/** Alerte à 80 % (warning), puis à 100 % et plus (exceeded). Pas de report d'un mois sur l'autre. */
export function budgetStatus(
  budget: Budget,
  month: string,
  txs: Transaction[],
  categories: Category[],
  asOf: IsoDate,
): BudgetStatus {
  const spent = spentInMonth(budget.categoryId, month, txs, categories, asOf);
  const ratio = budget.amount > 0 ? spent / budget.amount : 0;
  const level: BudgetLevel = ratio >= 1 ? 'exceeded' : ratio >= WARNING_THRESHOLD ? 'warning' : 'ok';
  return { budget, spent, remaining: budget.amount - spent, ratio, level };
}
