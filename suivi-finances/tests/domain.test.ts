import { describe, expect, it } from 'vitest';
import {
  accountBalance, budgetStatus, dueOccurrences, formatAmount, generateDue, goalProgress,
  monthSummary, parseAmount, totalBalance, validateTransaction,
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

  it('formate en euros français', () => {
    expect(formatAmount(123450).replace(/[  ]/g, ' ')).toBe('1 234,50 €');
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
  it('accepte versement et retrait sur une catégorie d’épargne', () => {
    expect(validateTransaction(flow('x', 'expense', 100, '2026-10-01', 'c-voyage'), accounts, cats)).toEqual([]);
    expect(validateTransaction(flow('y', 'income', 100, '2026-10-01', 'c-voyage'), accounts, cats)).toEqual([]);
  });
});

describe('budgets (mois civil, 1er du mois)', () => {
  const budget = { categoryId: 'c-courses', amount: 40000 };
  const spend = (amount: number) => [flow('t', 'expense', amount, '2026-10-15', 'c-courses')];

  it('ok sous 80 %', () => expect(budgetStatus(budget, '2026-10', spend(31999), cats, '2026-10-25').level).toBe('ok'));
  it('warning à 80 %', () => expect(budgetStatus(budget, '2026-10', spend(32000), cats, '2026-10-25').level).toBe('warning'));
  it('exceeded à 100 %', () => expect(budgetStatus(budget, '2026-10', spend(40000), cats, '2026-10-25').level).toBe('exceeded'));

  it('ne compte que le mois demandé, sans report', () => {
    const txs = [flow('a', 'expense', 10000, '2026-09-30', 'c-courses'), flow('b', 'expense', 5000, '2026-10-01', 'c-courses')];
    expect(budgetStatus(budget, '2026-10', txs, cats, '2026-10-25').spent).toBe(5000);
  });

  it('inclut les sous-catégories', () => {
    const withSub = [...cats, { id: 'c-bio', name: 'Bio', kind: 'expense' as const, parentId: 'c-courses', archived: false }];
    const txs = [flow('a', 'expense', 7000, '2026-10-02', 'c-bio')];
    expect(budgetStatus(budget, '2026-10', txs, withSub, '2026-10-25').spent).toBe(7000);
  });
});

describe('objectifs d’épargne liés à une catégorie', () => {
  const voyage = { id: 'g1', name: 'Voyage', categoryId: 'c-voyage', target: 100000, targetDate: '2027-01-31' };
  const apport = { id: 'g2', name: 'Apport', categoryId: 'c-apport', target: 500000 };
  const txs: Transaction[] = [
    flow('a', 'expense', 30000, '2026-09-10', 'c-voyage'),
    flow('b', 'expense', 20000, '2026-10-10', 'c-voyage'),
    flow('c', 'income', 5000, '2026-10-12', 'c-voyage'), // retrait
    flow('d', 'expense', 90000, '2026-10-12', 'c-apport'),
  ];

  it('plusieurs objectifs indépendants', () => {
    expect(goalProgress(voyage, txs, '2026-10-25').saved).toBe(45000);
    expect(goalProgress(apport, txs, '2026-10-25').saved).toBe(90000);
  });

  it('calcule le versement mensuel nécessaire (oct. à janv. = 4 mois)', () => {
    const p = goalProgress(voyage, txs, '2026-10-25');
    expect(p.remaining).toBe(55000);
    expect(p.monthlyNeeded).toBe(Math.ceil(55000 / 4));
  });

  it('détecte un objectif atteint ou échu', () => {
    expect(goalProgress({ ...voyage, target: 40000 }, txs, '2026-10-25').reached).toBe(true);
    expect(goalProgress({ ...voyage, targetDate: '2026-09-30' }, txs, '2026-10-25').overdue).toBe(true);
  });

  it('versements d’épargne comptés à part, hors dépenses', () => {
    const s = monthSummary('2026-10', [...txs, flow('i', 'income', 300000, '2026-10-01', 'c-salaire')], cats, '2026-10-25');
    expect(s.expenses).toBe(0);
    expect(s.savedToGoals).toBe(20000 - 5000 + 90000);
    expect(s.savingsRate).toBe(1);
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
