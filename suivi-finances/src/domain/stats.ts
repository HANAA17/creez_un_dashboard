import { monthKey } from './dates';
import type { Category, Cents, IsoDate, Transaction } from './types';

export interface MonthSummary {
  income: Cents;
  expenses: Cents;
  /** Versements nets vers les épargnes (versements − retraits). */
  savedToGoals: Cents;
  /** (revenus − dépenses) / revenus ; null si aucun revenu. */
  savingsRate: number | null;
}

/**
 * Les versements d'épargne ne sont pas des dépenses : ils sont comptés à part
 * et n'abaissent pas le taux d'épargne. Les virements entre comptes sont ignorés.
 */
export function monthSummary(
  month: string,
  txs: Transaction[],
  categories: Category[],
  asOf: IsoDate,
): MonthSummary {
  const kindOf = new Map(categories.map((c) => [c.id, c.kind]));
  let income = 0;
  let expenses = 0;
  let savedToGoals = 0;

  for (const tx of txs) {
    if (tx.type === 'transfer' || monthKey(tx.date) !== month || tx.date > asOf) continue;
    const kind = kindOf.get(tx.categoryId);
    if (kind === 'savings') savedToGoals += tx.type === 'expense' ? tx.amount : -tx.amount;
    else if (tx.type === 'income') income += tx.amount;
    else expenses += tx.amount;
  }

  return {
    income,
    expenses,
    savedToGoals,
    savingsRate: income > 0 ? (income - expenses) / income : null,
  };
}
