import { monthKey } from './dates';
import type { Allocation, Category, Cents, IsoDate, Transaction } from './types';

export interface MonthSummary {
  income: Cents;
  expenses: Cents;
  /** Argent mis de côté dans les enveloppes d'épargne ce mois-ci (répartitions − retraits). */
  savedToGoals: Cents;
  /** (revenus − dépenses) / revenus ; null si aucun revenu. */
  savingsRate: number | null;
}

/**
 * Les virements entre comptes sont ignorés. Toute dépense est une dépense, y compris celle faite
 * depuis une enveloppe d'épargne (le voyage payé). Répartir de l'argent n'est pas une dépense.
 */
export function monthSummary(
  month: string,
  txs: Transaction[],
  categories: Category[],
  asOf: IsoDate,
  allocations: Allocation[] = [],
): MonthSummary {
  let income = 0;
  let expenses = 0;
  for (const tx of txs) {
    if (tx.type === 'transfer' || monthKey(tx.date) !== month || tx.date > asOf) continue;
    if (tx.type === 'income') income += tx.amount;
    else expenses += tx.amount;
  }

  const savings = new Set(categories.filter((c) => c.kind === 'savings').map((c) => c.id));
  const savedToGoals = allocations.reduce(
    (sum, a) => (savings.has(a.categoryId) && monthKey(a.date) === month && a.date <= asOf ? sum + a.amount : sum),
    0,
  );

  return { income, expenses, savedToGoals, savingsRate: income > 0 ? (income - expenses) / income : null };
}
