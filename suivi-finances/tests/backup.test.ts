import { describe, expect, it } from 'vitest';
import { parseBackup, serializeBackup, type Data } from '../src/backup';
import { parseBalance } from '../src/domain';

const data: Data = {
  accounts: [{ id: 'a1', name: 'Courant', type: 'checking', initialBalance: -8000, archived: false }],
  categories: [{ id: 'c1', name: 'Courses', kind: 'expense', parentId: null, archived: false }],
  transactions: [{ id: 't1', type: 'expense', amount: 1250, date: '2026-10-01', accountId: 'a1', categoryId: 'c1' }],
  budgets: [{ categoryId: 'c1', amount: 40000 }],
  goals: [],
  recurrences: [],
  allocations: [],
  envelopesStart: '2026-10-01',
};

describe('sauvegarde', () => {
  it('export puis import redonne les mêmes données', () => {
    expect(parseBackup(serializeBackup(data), '2026-10-26').data).toEqual(data);
  });
  it.each([
    ['pas du JSON', 'abc'],
    ['autre application', JSON.stringify({ app: 'autre', data: {} })],
    ['version future', JSON.stringify({ app: 'suivi-finances', version: 99, data })],
    ['table manquante', JSON.stringify({ app: 'suivi-finances', version: 1, data: { accounts: [] } })],
    ['montant négatif', JSON.stringify({ app: 'suivi-finances', version: 1, data: { ...data, transactions: [{ ...data.transactions[0], amount: -5 }] } })],
    ['doublons', JSON.stringify({ app: 'suivi-finances', version: 1, data: { ...data, transactions: [data.transactions[0], data.transactions[0]] } })],
  ])('refuse : %s', (_, text) => expect(() => parseBackup(text, '2026-10-26')).toThrow());
});

describe('solde initial', () => {
  it.each([
    ['', 0], ['0', 0], ['0,00', 0], ['1250,50', 125050], ['-80', -8000], ['-12,5', -1250],
  ])('lit "%s"', (input, cents) => expect(parseBalance(input)).toBe(cents));
  it.each(['abc', '1,234', '--5'])('refuse "%s"', (input) => expect(parseBalance(input)).toBeNull());
});

describe('sauvegarde v2 et mise à niveau depuis la v1', () => {
  const v1Data = {
    accounts: [{ id: 'a1', name: 'Courant', type: 'checking', initialBalance: 100000, archived: false }],
    categories: [
      { id: 'c1', name: 'Courses', kind: 'expense', archived: false },
      { id: 'cs', name: 'Voyage', kind: 'savings', archived: false },
    ],
    transactions: [
      { id: 't1', type: 'expense', amount: 5000, date: '2026-10-01', accountId: 'a1', categoryId: 'c1' },
      { id: 't2', type: 'expense', amount: 20000, date: '2026-10-02', accountId: 'a1', categoryId: 'cs' }, // versement
      { id: 't3', type: 'income', amount: 3000, date: '2026-10-05', accountId: 'a1', categoryId: 'cs' }, // retrait
    ],
    budgets: [{ categoryId: 'c1', amount: 40000 }],
    goals: [{ id: 'g1', name: 'Voyage', categoryId: 'cs', target: 100000 }],
    recurrences: [
      { id: 'r1', frequency: 'monthly', interval: 1, startDate: '2026-10-01', template: { type: 'expense', amount: 10000, accountId: 'a1', categoryId: 'cs' } },
      { id: 'r2', frequency: 'monthly', interval: 1, startDate: '2026-10-01', template: { type: 'expense', amount: 80000, accountId: 'a1', categoryId: 'c1' } },
    ],
  };

  it('v2 : export puis import redonne les mêmes données', () => {
    const d2 = { ...data, allocations: [{ id: 'x', date: '2026-10-01', categoryId: 'c1', amount: 10000 }], envelopesStart: '2026-10-01' };
    const { data: back, upgrade } = parseBackup(serializeBackup(d2), '2026-10-26');
    expect(back).toEqual(d2);
    expect(upgrade).toBeNull();
  });

  it('v1 : les versements et retraits d’épargne deviennent des répartitions', () => {
    const { data: d, upgrade } = parseBackup(JSON.stringify({ app: 'suivi-finances', version: 1, data: v1Data }), '2026-10-26');
    expect(upgrade).toEqual({ converted: 2, removedRecurrences: 1 });
    expect(d.transactions.map((t) => t.id)).toEqual(['t1']);
    expect(d.allocations.map((a) => [a.categoryId, a.amount])).toEqual([['cs', 20000], ['cs', -3000]]);
    expect(d.recurrences.map((r) => r.id)).toEqual(['r2']);
    expect(d.envelopesStart).toBe('2026-10-26');
    expect(d.budgets).toEqual(v1Data.budgets);
  });

  it('v2 : refuse une répartition nulle ou sans allocations', () => {
    const { allocations: _omit, ...withoutAllocations } = data;
    expect(() => parseBackup(JSON.stringify({ app: 'suivi-finances', version: 2, data: withoutAllocations }), '2026-10-26')).toThrow();
    expect(() => parseBackup(JSON.stringify({ app: 'suivi-finances', version: 2, data: { ...data, allocations: [{ id: 'z', date: '2026-10-01', categoryId: 'c1', amount: 0 }] } }), '2026-10-26')).toThrow();
  });
});
