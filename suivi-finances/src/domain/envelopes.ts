import { totalBalance } from './balances';
import { monthKey } from './dates';
import type { Account, Allocation, Budget, Category, Cents, IsoDate, Transaction } from './types';

/** Tout ce qu'il faut pour calculer des soldes d'enveloppes. */
export interface EnvelopeData {
  allocations: Allocation[];
  transactions: Transaction[];
  categories: Category[];
  /** Les dépenses datées avant ce jour ne vident aucune enveloppe (elles précèdent la mise en place des enveloppes). */
  start: IsoDate;
}

/** Chaque catégorie de dépense ou d'épargne non archivée est une enveloppe. */
export function envelopes(categories: Category[]): Category[] {
  return categories.filter((c) => !c.archived && (c.kind === 'expense' || c.kind === 'savings'));
}

function withChildren(categoryId: string, categories: Category[]): Set<string> {
  const ids = new Set([categoryId]);
  for (const c of categories) if (c.parentId === categoryId) ids.add(c.id);
  return ids;
}

/** Dépenses d'une enveloppe sur une période (sous-catégories incluses), à partir de la date de départ. */
export function envelopeSpent(categoryId: string, d: EnvelopeData, from: IsoDate, to: IsoDate): Cents {
  const ids = withChildren(categoryId, d.categories);
  const lower = from > d.start ? from : d.start;
  return d.transactions.reduce(
    (sum, tx) => (tx.type === 'expense' && ids.has(tx.categoryId) && tx.date >= lower && tx.date <= to ? sum + tx.amount : sum),
    0,
  );
}

/**
 * Solde d'une enveloppe = argent réparti (cumulé, sans remise à zéro en fin de mois) − dépenses.
 * Peut être négatif : l'enveloppe est alors dépassée.
 */
export function envelopeBalance(categoryId: string, d: EnvelopeData, asOf: IsoDate): Cents {
  const allocated = d.allocations.reduce(
    (sum, a) => (a.categoryId === categoryId && a.date <= asOf ? sum + a.amount : sum),
    0,
  );
  return allocated - envelopeSpent(categoryId, d, d.start, asOf);
}

export function envelopeBalances(d: EnvelopeData, asOf: IsoDate): Map<string, Cents> {
  return new Map(envelopes(d.categories).map((c) => [c.id, envelopeBalance(c.id, d, asOf)]));
}

export interface PoolSummary {
  /** Total des comptes non archivés. */
  total: Cents;
  /** Somme des soldes des enveloppes. */
  inEnvelopes: Cents;
  /** Argent des comptes pas encore réparti. Négatif = tu as réparti plus que ce que tu possèdes. */
  toAllocate: Cents;
}

/**
 * « À répartir » = total des comptes − somme des enveloppes. Il est calculé, jamais saisi :
 * modifier un compte ou une transaction le met à jour tout seul, et le contrôle total = enveloppes + à répartir tient toujours.
 */
export function poolSummary(accounts: Account[], d: EnvelopeData, asOf: IsoDate): PoolSummary {
  const total = totalBalance(accounts, d.transactions, asOf);
  const inEnvelopes = [...envelopeBalances(d, asOf).values()].reduce((s, v) => s + v, 0);
  return { total, inEnvelopes, toAllocate: total - inEnvelopes };
}

/** Lignes à enregistrer pour un transfert. `from`/`to` à null = « À répartir ». */
export function transferEntries(
  from: string | null,
  to: string | null,
  amount: Cents,
  date: IsoDate,
  groupId: string,
  ids: [string, string],
  note?: string,
): Allocation[] {
  const entries: Allocation[] = [];
  if (from !== null) entries.push({ id: ids[0], date, categoryId: from, amount: -amount, groupId, note });
  if (to !== null) entries.push({ id: ids[1], date, categoryId: to, amount, groupId, note });
  return entries;
}

export interface EnvelopeLine {
  kind: 'allocation' | 'expense';
  date: IsoDate;
  amount: Cents; // signé : + entre dans l'enveloppe, − en sort
  allocation?: Allocation;
  transaction?: Transaction;
}

/** Historique d'une enveloppe (répartitions et dépenses), du plus récent au plus ancien. */
export function envelopeHistory(categoryId: string, d: EnvelopeData, asOf: IsoDate): EnvelopeLine[] {
  const ids = withChildren(categoryId, d.categories);
  const lines: EnvelopeLine[] = [];
  for (const a of d.allocations) {
    if (a.categoryId === categoryId && a.date <= asOf) lines.push({ kind: 'allocation', date: a.date, amount: a.amount, allocation: a });
  }
  for (const tx of d.transactions) {
    if (tx.type === 'expense' && ids.has(tx.categoryId) && tx.date >= d.start && tx.date <= asOf) {
      lines.push({ kind: 'expense', date: tx.date, amount: -tx.amount, transaction: tx });
    }
  }
  return lines.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
}

/** Total du plan mensuel. */
export const planTotal = (plan: Budget[]): Cents => plan.reduce((s, b) => s + b.amount, 0);

/** Dépensé ce mois-ci dans une enveloppe (pour afficher le rythme de consommation). */
export function spentThisMonth(categoryId: string, d: EnvelopeData, asOf: IsoDate): Cents {
  return envelopeSpent(categoryId, d, `${monthKey(asOf)}-01`, asOf);
}
