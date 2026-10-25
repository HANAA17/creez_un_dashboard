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
};

describe('sauvegarde', () => {
  it('export puis import redonne les mêmes données', () => {
    expect(parseBackup(serializeBackup(data))).toEqual(data);
  });
  it.each([
    ['pas du JSON', 'abc'],
    ['autre application', JSON.stringify({ app: 'autre', data: {} })],
    ['version future', JSON.stringify({ app: 'suivi-finances', version: 99, data })],
    ['table manquante', JSON.stringify({ app: 'suivi-finances', version: 1, data: { accounts: [] } })],
    ['montant négatif', JSON.stringify({ app: 'suivi-finances', version: 1, data: { ...data, transactions: [{ ...data.transactions[0], amount: -5 }] } })],
    ['doublons', JSON.stringify({ app: 'suivi-finances', version: 1, data: { ...data, transactions: [data.transactions[0], data.transactions[0]] } })],
  ])('refuse : %s', (_, text) => expect(() => parseBackup(text)).toThrow());
});

describe('solde initial', () => {
  it.each([
    ['', 0], ['0', 0], ['0,00', 0], ['1250,50', 125050], ['-80', -8000], ['-12,5', -1250],
  ])('lit "%s"', (input, cents) => expect(parseBalance(input)).toBe(cents));
  it.each(['abc', '1,234', '--5'])('refuse "%s"', (input) => expect(parseBalance(input)).toBeNull());
});
