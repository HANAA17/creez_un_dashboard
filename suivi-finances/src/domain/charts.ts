import { addMonthsClamped, daysInMonth, monthKey, parseDate, toIso } from './dates';
import { accountBalance } from './balances';
import { monthSummary, type MonthSummary } from './stats';
import type { Account, Allocation, Category, Cents, IsoDate, Transaction } from './types';

export interface CategoryTotal {
  /** null = regroupement « Autres ». */
  categoryId: string | null;
  amount: Cents;
}

/**
 * Dépenses du mois par catégorie, triées, regroupées sur la catégorie parente.
 * Les dépenses faites depuis une enveloppe d'épargne comptent aussi. Au-delà de `max` lignes, le reste est regroupé en « Autres ».
 */
export function expensesByCategory(
  month: string,
  txs: Transaction[],
  categories: Category[],
  asOf: IsoDate,
  max = 6,
): CategoryTotal[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, Cents>();
  for (const tx of txs) {
    if (tx.type !== 'expense' || monthKey(tx.date) !== month || tx.date > asOf) continue;
    const c = byId.get(tx.categoryId);
    if (!c || c.kind === 'income') continue;
    const root = c.parentId && byId.has(c.parentId) ? c.parentId : c.id;
    totals.set(root, (totals.get(root) ?? 0) + tx.amount);
  }
  const sorted = [...totals.entries()].map(([categoryId, amount]) => ({ categoryId, amount })).sort((a, b) => b.amount - a.amount);
  if (sorted.length <= max) return sorted;
  const head = sorted.slice(0, max - 1);
  const rest = sorted.slice(max - 1).reduce((s, x) => s + x.amount, 0);
  return [...head, { categoryId: null, amount: rest }];
}

/** Les `count` derniers mois, du plus ancien au mois de `month` inclus. */
export function lastMonths(month: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonthsClamped(`${month}-01`, i - (count - 1)).slice(0, 7));
}

export interface MonthPoint extends MonthSummary {
  month: string;
}

export function monthlySeries(months: string[], txs: Transaction[], categories: Category[], asOf: IsoDate, allocations: Allocation[] = []): MonthPoint[] {
  return months.map((month) => ({ month, ...monthSummary(month, txs, categories, asOf, allocations) }));
}

export interface BalancePoint {
  month: string;
  /** Date du solde : fin du mois, ou `asOf` pour le mois en cours. */
  date: IsoDate;
  balance: Cents;
}

/** Solde total (comptes non archivés) à la fin de chaque mois demandé. */
export function balanceSeries(months: string[], accounts: Account[], txs: Transaction[], asOf: IsoDate): BalancePoint[] {
  const active = accounts.filter((a) => !a.archived);
  return months.map((month) => {
    const { y, m } = parseDate(`${month}-01`);
    const end = toIso(y, m, daysInMonth(y, m));
    const date = end > asOf ? asOf : end;
    return { month, date, balance: active.reduce((s, a) => s + accountBalance(a, txs, date), 0) };
  });
}
