import { describe, expect, it } from 'vitest';
import {
  accountBalance, dueOccurrences, formatAmount, generateDue, goalProgress, getCurrency, setCurrency,
  monthSummary, parseAmount, parseOptionalAmount, totalBalance, validateTransaction,
  type Account, type Category, type Flow, type RecurrenceRule, type Transaction, type Transfer,
} from '../src/domain';

const courant: Account = { id: 'a1', name: 'Courant', type: 'checking', initialBalance: 100000, archived: false };
const livret: Account = { id: 'a2', name: 'Livret A', type: 'savings', initialBalance: 50000, archived: false };
const accounts = [courant, livret];

const cats: Category[] = [
  { id: 'c-courses', name: 'Courses', kind: 'expense', archived: false },
  { id: 'c-salaire', name: 'Salaire', kind: 'income', archived: false },
  { id: 'c-voyage', name: 'Voyage', kind: 'savings', archived: false },
  { id: 'c-apport', name: 'Apport', kind: 'savings', archived: false },
];

const flow = (id: string, type: 'expense' | 'income', amount: number, date: string, categoryId: string, accountId = 'a1'): Flow =>
  ({ id, type, amount, date, categoryId, accountId });
const transfer = (id: string, amount: number, date: string, from = 'a1', to = 'a2'): Transfer =>
  ({ id, type: 'transfer', amount, date, fromAccountId: from, toAccountId: to });

describe('montants décimaux', () => {
  it.each([
    ['12,50', 1250], ['12.5', 1250], ['12', 1200], ['1 200,00', 120000], ['0,05', 5], ['19,99 €', 1999],
  ])('lit "%s" comme %i centimes', (input, cents) => expect(parseAmount(input)).toBe(cents));

  it.each(['', 'abc', '-5', '0', '0,00', '1,234', '1,2,3'])('refuse "%s"', (input) =>
    expect(parseAmount(input)).toBeNull());

  it('évite les erreurs de flottants (19,99 € x 3)', () => {
    expect(parseAmount('19,99')! * 3).toBe(5997);
  });

  it('formate en dirhams par défaut, en euros sur demande', () => {
    const norm = (s: string) => s.replace(/[\u202f\u00a0]/g, ' ');
    expect(getCurrency()).toBe('MAD');
    expect(norm(formatAmount(123450))).toBe('1 234,50 DH');
    setCurrency('EUR');
    expect(norm(formatAmount(123450))).toBe('1 234,50 €');
    setCurrency('MAD');
  });

  it('accepte DH, MAD et € dans la saisie', () => {
    expect(parseAmount('1 200,50 DH')).toBe(120050);
    expect(parseAmount('300 mad')).toBe(30000);
  });

  it('montant facultatif : vide ou 0 = 0, jamais négatif', () => {
    expect(parseOptionalAmount('')).toBe(0);
    expect(parseOptionalAmount('0')).toBe(0);
    expect(parseOptionalAmount('250,5')).toBe(25050);
    expect(parseOptionalAmount('-5')).toBeNull();
    expect(parseOptionalAmount('abc')).toBeNull();
  });
});

describe('soldes et virements', () => {
  const txs: Transaction[] = [
    flow('t1', 'income', 200000, '2026-10-01', 'c-salaire'),
    flow('t2', 'expense', 4550, '2026-10-05', 'c-courses'),
    transfer('t3', 30000, '2026-10-10'),
    transfer('t4', 10000, '2026-11-10'), // futur
  ];

  it('calcule le solde de chaque compte', () => {
    expect(accountBalance(courant, txs, '2026-10-25')).toBe(100000 + 200000 - 4550 - 30000);
    expect(accountBalance(livret, txs, '2026-10-25')).toBe(50000 + 30000);
  });

  it('ignore les transactions futures', () => {
    expect(accountBalance(livret, txs, '2026-12-01')).toBe(50000 + 30000 + 10000);
  });

  it('un virement ne change pas le total', () => {
    const avant = totalBalance(accounts, txs.slice(0, 2), '2026-10-25');
    expect(totalBalance(accounts, txs.slice(0, 3), '2026-10-25')).toBe(avant);
  });

  it('un virement n’est ni revenu ni dépense', () => {
    const s = monthSummary('2026-10', txs, cats, '2026-10-25');
    expect(s.income).toBe(200000);
    expect(s.expenses).toBe(4550);
  });
});

describe('validation', () => {
  it('refuse un virement vers le même compte', () => {
    expect(validateTransaction(transfer('x', 100, '2026-10-01', 'a1', 'a1'), accounts, cats)).not.toEqual([]);
  });
  it('refuse un montant nul et un compte archivé', () => {
    const archived = { ...livret, archived: true };
    expect(validateTransaction(transfer('x', 0, '2026-10-01'), [courant, archived], cats).length).toBe(2);
  });
  it('refuse une catégorie de revenu pour une dépense', () => {
    expect(validateTransaction(flow('x', 'expense', 100, '2026-10-01', 'c-salaire'), accounts, cats)).not.toEqual([]);
  });
  it('une catégorie d’épargne accepte une dépense mais pas un revenu', () => {
    expect(validateTransaction(flow('x', 'expense', 100, '2026-10-01', 'c-voyage'), accounts, cats)).toEqual([]);
    expect(validateTransaction(flow('y', 'income', 100, '2026-10-01', 'c-voyage'), accounts, cats)).not.toEqual([]);
  });
});

describe('planification répétée', () => {
  const monthly = (startDate: string, extra: Partial<RecurrenceRule> = {}): RecurrenceRule => ({
    id: 'r1', frequency: 'monthly', interval: 1, startDate,
    template: { type: 'expense', amount: 80000, accountId: 'a1', categoryId: 'c-courses' }, ...extra,
  });

  it('mensuel : une échéance par mois', () => {
    expect(dueOccurrences(monthly('2026-08-05'), '2026-10-25')).toEqual(['2026-08-05', '2026-09-05', '2026-10-05']);
  });

  it('le 31 tombe le dernier jour des mois courts, sans dérive', () => {
    expect(dueOccurrences(monthly('2026-01-31'), '2026-05-31'))
      .toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  });

  it('hebdomadaire, annuel (29 févr.) et intervalle', () => {
    expect(dueOccurrences(monthly('2026-10-01', { frequency: 'weekly' }), '2026-10-20')).toEqual(['2026-10-01', '2026-10-08', '2026-10-15']);
    expect(dueOccurrences(monthly('2028-02-29', { frequency: 'yearly' }), '2030-12-31')).toEqual(['2028-02-29', '2029-02-28', '2030-02-28']);
    expect(dueOccurrences(monthly('2026-01-15', { interval: 3 }), '2026-12-31')).toEqual(['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15']);
  });

  it('respecte la date de fin', () => {
    expect(dueOccurrences(monthly('2026-08-05', { endDate: '2026-09-30' }), '2026-12-31')).toEqual(['2026-08-05', '2026-09-05']);
  });

  it('ne crée jamais de doublon', () => {
    const first = generateDue(monthly('2026-08-05'), '2026-10-25');
    expect(first.transactions.map((t) => t.id)).toEqual(['r1:2026-08-05', 'r1:2026-09-05', 'r1:2026-10-05']);
    expect(generateDue(first.rule, '2026-10-25').transactions).toEqual([]);
    expect(generateDue(first.rule, '2026-11-06').transactions.map((t) => t.date)).toEqual(['2026-11-05']);
  });

  it('fonctionne pour un revenu et un virement', () => {
    const salaire: RecurrenceRule = { id: 'r2', frequency: 'monthly', interval: 1, startDate: '2026-10-01',
      template: { type: 'income', amount: 250000, accountId: 'a1', categoryId: 'c-salaire' } };
    const vir: RecurrenceRule = { id: 'r3', frequency: 'monthly', interval: 1, startDate: '2026-10-02',
      template: { type: 'transfer', amount: 20000, fromAccountId: 'a1', toAccountId: 'a2' } };
    const all = [...generateDue(salaire, '2026-10-25').transactions, ...generateDue(vir, '2026-10-25').transactions];
    expect(all.map((t) => t.type)).toEqual(['income', 'transfer']);
    expect(totalBalance(accounts, all, '2026-10-25')).toBe(150000 + 250000);
  });
});
