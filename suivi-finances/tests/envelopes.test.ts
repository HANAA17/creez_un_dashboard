import { describe, expect, it } from 'vitest';
import {
  envelopeBalance, envelopeHistory, envelopes, goalProgress, monthSummary, poolSummary, spentThisMonth, transferEntries,
  type Account, type Allocation, type Category, type EnvelopeData, type Flow, type Transaction,
} from '../src/domain';

const cats: Category[] = [
  { id: 'loyer', name: 'Loyer', kind: 'expense', archived: false },
  { id: 'courses', name: 'Courses', kind: 'expense', archived: false },
  { id: 'voyage', name: 'Voyage', kind: 'savings', archived: false },
  { id: 'salaire', name: 'Salaire', kind: 'income', archived: false },
  { id: 'vieux', name: 'Ancienne', kind: 'expense', archived: true },
];
const cc: Account = { id: 'cc', name: 'Courant', type: 'checking', initialBalance: 0, archived: false };
const livret: Account = { id: 'lv', name: 'Livret', type: 'savings', initialBalance: 0, archived: false };

const flow = (id: string, type: 'expense' | 'income', amount: number, date: string, categoryId: string): Flow =>
  ({ id, type, amount, date, categoryId, accountId: 'cc' });
const alloc = (id: string, categoryId: string, amount: number, date: string, groupId?: string): Allocation =>
  ({ id, categoryId, amount, date, groupId });

const data = (allocations: Allocation[], transactions: Transaction[], start = '2026-10-01'): EnvelopeData =>
  ({ allocations, transactions, categories: cats, start });

describe('enveloppes : solde cumulé sans remise à zéro', () => {
  // Salaire de 10 000 DH, 2 000 dans Courses, dont 1 800 dépensés.
  const txs = [flow('i', 'income', 1000000, '2026-10-01', 'salaire'), flow('c1', 'expense', 180000, '2026-10-10', 'courses')];
  const allocs = [alloc('a1', 'courses', 200000, '2026-10-01')];

  it('solde = réparti − dépensé', () => {
    expect(envelopeBalance('courses', data(allocs, txs), '2026-10-25')).toBe(20000);
  });

  it('le reste est conservé au mois suivant et s’additionne à la nouvelle répartition', () => {
    const next = [...allocs, alloc('a2', 'courses', 200000, '2026-11-01')];
    expect(envelopeBalance('courses', data(next, txs), '2026-11-02')).toBe(220000);
  });

  it('une enveloppe dépassée passe en négatif', () => {
    const more = [...txs, flow('c2', 'expense', 50000, '2026-10-20', 'courses')];
    expect(envelopeBalance('courses', data(allocs, more), '2026-10-25')).toBe(-30000);
  });

  it('ignore les dépenses antérieures à la date de départ et les dépenses futures', () => {
    const old = [flow('o', 'expense', 99999, '2026-09-30', 'courses'), flow('f', 'expense', 5000, '2026-11-05', 'courses')];
    expect(envelopeBalance('courses', data(allocs, old), '2026-10-25')).toBe(200000);
  });

  it('seules les catégories de dépense et d’épargne non archivées sont des enveloppes', () => {
    expect(envelopes(cats).map((c) => c.id)).toEqual(['loyer', 'courses', 'voyage']);
  });
});

describe('à répartir', () => {
  const txs = [flow('i', 'income', 1000000, '2026-10-01', 'salaire'), flow('c', 'expense', 180000, '2026-10-10', 'courses')];

  it('tout le salaire est à répartir tant que rien n’est réparti', () => {
    const p = poolSummary([cc], data([], [txs[0]!]), '2026-10-25');
    expect(p).toEqual({ total: 1000000, inEnvelopes: 0, toAllocate: 1000000 });
  });

  it('répartir déplace l’argent vers les enveloppes sans changer le total', () => {
    const allocs = [alloc('a1', 'courses', 200000, '2026-10-01'), alloc('a2', 'loyer', 350000, '2026-10-01')];
    const p = poolSummary([cc], data(allocs, [txs[0]!]), '2026-10-25');
    expect(p.total).toBe(1000000);
    expect(p.inEnvelopes).toBe(550000);
    expect(p.toAllocate).toBe(450000);
  });

  it('dépenser ne modifie pas « à répartir » : c’est l’enveloppe qui paie', () => {
    const allocs = [alloc('a1', 'courses', 200000, '2026-10-01')];
    const before = poolSummary([cc], data(allocs, [txs[0]!]), '2026-10-25').toAllocate;
    const after = poolSummary([cc], data(allocs, txs), '2026-10-25').toAllocate;
    expect(after).toBe(before);
  });

  it('un virement entre comptes ne change rien', () => {
    const t: Transaction = { id: 'v', type: 'transfer', amount: 100000, date: '2026-10-05', fromAccountId: 'cc', toAccountId: 'lv' };
    const a = poolSummary([cc, livret], data([], [txs[0]!]), '2026-10-25').toAllocate;
    const b = poolSummary([cc, livret], data([], [txs[0]!, t]), '2026-10-25').toAllocate;
    expect(b).toBe(a);
  });

  it('répartir plus que le total donne un « à répartir » négatif', () => {
    const allocs = [alloc('a1', 'courses', 1200000, '2026-10-01')];
    expect(poolSummary([cc], data(allocs, [txs[0]!]), '2026-10-25').toAllocate).toBe(-200000);
  });

  it('dépense hors enveloppe (avant la date de départ) : elle réduit bien « à répartir »', () => {
    const old = flow('o', 'expense', 30000, '2026-09-15', 'courses');
    const p = poolSummary([cc], data([], [txs[0]!, old]), '2026-10-25');
    expect(p.toAllocate).toBe(970000);
  });
});

describe('transferts entre enveloppes', () => {
  it('crée deux lignes liées dont la somme est nulle', () => {
    const e = transferEntries('courses', 'voyage', 20000, '2026-10-26', 'g1', ['x', 'y']);
    expect(e.map((a) => a.amount)).toEqual([-20000, 20000]);
    expect(new Set(e.map((a) => a.groupId))).toEqual(new Set(['g1']));
  });

  it('le transfert déplace le solde sans toucher au total ni à « à répartir »', () => {
    const txs = [flow('i', 'income', 1000000, '2026-10-01', 'salaire')];
    const base = [alloc('a1', 'courses', 200000, '2026-10-01')];
    const moved = [...base, ...transferEntries('courses', 'voyage', 50000, '2026-10-20', 'g', ['m1', 'm2'])];
    const d = data(moved, txs);
    expect(envelopeBalance('courses', d, '2026-10-25')).toBe(150000);
    expect(envelopeBalance('voyage', d, '2026-10-25')).toBe(50000);
    expect(poolSummary([cc], d, '2026-10-25').toAllocate).toBe(poolSummary([cc], data(base, txs), '2026-10-25').toAllocate);
  });

  it('depuis ou vers « à répartir » (null) : une seule ligne', () => {
    expect(transferEntries(null, 'voyage', 100, '2026-10-26', 'g', ['a', 'b'])).toHaveLength(1);
    expect(transferEntries('voyage', null, 100, '2026-10-26', 'g', ['a', 'b'])[0]!.amount).toBe(-100);
  });
});

describe('objectifs d’épargne = enveloppes', () => {
  const goal = { id: 'g', name: 'Voyage', categoryId: 'voyage', target: 100000, targetDate: '2027-01-31' };
  const allocs = [alloc('a', 'voyage', 30000, '2026-10-02'), alloc('b', 'voyage', 20000, '2026-10-10'), alloc('c', 'voyage', -5000, '2026-10-12')];

  it('progression = argent réservé', () => {
    const p = goalProgress(goal, data(allocs, []), '2026-10-25');
    expect(p.saved).toBe(45000);
    expect(p.remaining).toBe(55000);
  });

  it('versement mensuel nécessaire (oct. à janv. = 4 mois)', () => {
    expect(goalProgress(goal, data(allocs, []), '2026-10-25').monthlyNeeded).toBe(Math.ceil(55000 / 4));
  });

  it('payer le voyage avec l’enveloppe la vide', () => {
    const spend = flow('p', 'expense', 40000, '2026-10-20', 'voyage');
    expect(goalProgress(goal, data(allocs, [spend]), '2026-10-25').saved).toBe(5000);
  });

  it('objectif atteint ou échu', () => {
    expect(goalProgress({ ...goal, target: 40000 }, data(allocs, []), '2026-10-25').reached).toBe(true);
    expect(goalProgress({ ...goal, targetDate: '2026-09-30' }, data(allocs, []), '2026-10-25').overdue).toBe(true);
  });
});

describe('résumé du mois avec enveloppes', () => {
  it('répartir n’est pas dépenser ; l’épargne mise de côté est comptée à part', () => {
    const txs = [flow('i', 'income', 1000000, '2026-10-01', 'salaire'), flow('c', 'expense', 100000, '2026-10-05', 'courses')];
    const allocs = [alloc('a', 'voyage', 100000, '2026-10-02'), alloc('b', 'voyage', -20000, '2026-10-15'), alloc('c', 'courses', 300000, '2026-10-02')];
    const s = monthSummary('2026-10', txs, cats, '2026-10-25', allocs);
    expect(s.expenses).toBe(100000);
    expect(s.savedToGoals).toBe(80000);
    expect(s.savingsRate).toBe(0.9);
  });

  it('une dépense payée par une enveloppe d’épargne reste une dépense', () => {
    const txs = [flow('p', 'expense', 40000, '2026-10-20', 'voyage')];
    expect(monthSummary('2026-10', txs, cats, '2026-10-25').expenses).toBe(40000);
  });
});

describe('historique et rythme', () => {
  it('liste répartitions et dépenses, récentes d’abord', () => {
    const d = data([alloc('a', 'courses', 200000, '2026-10-01')], [flow('c', 'expense', 5000, '2026-10-10', 'courses')]);
    const h = envelopeHistory('courses', d, '2026-10-25');
    expect(h.map((l) => [l.kind, l.amount])).toEqual([['expense', -5000], ['allocation', 200000]]);
  });

  it('dépensé ce mois-ci', () => {
    const txs = [flow('a', 'expense', 7000, '2026-10-03', 'courses'), flow('b', 'expense', 4000, '2026-10-29', 'courses')];
    expect(spentThisMonth('courses', data([], txs, '2026-09-01'), '2026-10-25')).toBe(7000);
  });
});
