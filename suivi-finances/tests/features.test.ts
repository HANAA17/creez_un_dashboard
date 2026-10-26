import { describe, expect, it } from 'vitest';
import {
  balanceSeries, dueOccurrences, expensesByCategory, generateDue, isFinished, lastMonths, monthlySeries,
  nextOccurrence, pauseRule, resumeRule, upcomingOccurrences,
  type Account, type Category, type Flow, type RecurrenceRule, type Transaction,
} from '../src/domain';

const rule = (extra: Partial<RecurrenceRule> = {}): RecurrenceRule => ({
  id: 'r', frequency: 'monthly', interval: 1, startDate: '2026-08-05',
  template: { type: 'expense', amount: 80000, accountId: 'a1', categoryId: 'c1' }, ...extra,
});

describe('planifications : prochaine échéance, pause, reprise', () => {
  it('prochaine échéance avant toute création', () => {
    expect(nextOccurrence(rule())).toBe('2026-08-05');
  });
  it('prochaine échéance après création', () => {
    const { rule: r } = generateDue(rule(), '2026-10-25');
    expect(nextOccurrence(r)).toBe('2026-11-05');
  });
  it('terminée après la date de fin', () => {
    const { rule: r } = generateDue(rule({ endDate: '2026-09-30' }), '2026-12-31');
    expect(nextOccurrence(r)).toBeNull();
    expect(isFinished(r)).toBe(true);
    expect(isFinished(rule())).toBe(false);
  });
  it('en pause : aucune échéance créée', () => {
    expect(dueOccurrences(pauseRule(rule()), '2026-12-31')).toEqual([]);
  });
  it('reprise : pas de rattrapage des échéances manquées', () => {
    const { rule: created } = generateDue(rule(), '2026-09-10'); // 5 août, 5 sept.
    const paused = pauseRule(created);
    const resumed = resumeRule(paused, '2026-12-20');
    expect(resumed.paused).toBe(false);
    expect(dueOccurrences(resumed, '2026-12-20')).toEqual([]); // octobre, novembre, décembre ignorés
    expect(nextOccurrence(resumed)).toBe('2027-01-05');
  });
});

describe('aperçu des prochaines dates', () => {
  it('liste les prochaines dates à partir d’un jour donné', () => {
    expect(upcomingOccurrences(rule(), '2026-10-25', 3)).toEqual(['2026-11-05', '2026-12-05', '2027-01-05']);
  });
  it('inclut le jour même et s’arrête à la date de fin', () => {
    expect(upcomingOccurrences(rule({ endDate: '2026-12-31' }), '2026-11-05', 5)).toEqual(['2026-11-05', '2026-12-05']);
  });
});

describe('graphiques', () => {
  const cats: Category[] = [
    { id: 'p', name: 'Logement', kind: 'expense', archived: false },
    { id: 'p-sub', name: 'Loyer', kind: 'expense', parentId: 'p', archived: false },
    { id: 'c2', name: 'Courses', kind: 'expense', archived: false },
    { id: 's', name: 'Voyage', kind: 'savings', archived: false },
    { id: 'i', name: 'Salaire', kind: 'income', archived: false },
    ...['d', 'e', 'f', 'g', 'h'].map((id): Category => ({ id, name: id, kind: 'expense', archived: false })),
  ];
  const a: Account = { id: 'a1', name: 'Courant', type: 'checking', initialBalance: 100000, archived: false };
  const f = (id: string, type: 'expense' | 'income', amount: number, date: string, categoryId: string): Flow =>
    ({ id, type, amount, date, categoryId, accountId: 'a1' });

  it('regroupe les sous-catégories, exclut l’épargne, trie par montant', () => {
    const txs: Transaction[] = [
      f('1', 'expense', 50000, '2026-10-01', 'p-sub'),
      f('2', 'expense', 10000, '2026-10-02', 'p'),
      f('3', 'expense', 30000, '2026-10-03', 'c2'),
      f('4', 'expense', 99999, '2026-10-04', 's'),
      f('5', 'expense', 7000, '2026-09-30', 'c2'),
      f('6', 'expense', 7000, '2026-11-01', 'c2'),
    ];
    expect(expensesByCategory('2026-10', txs, cats, '2026-10-25')).toEqual([
      { categoryId: 'p', amount: 60000 }, { categoryId: 'c2', amount: 30000 },
    ]);
  });

  it('regroupe le reste en « Autres » au-delà du maximum', () => {
    const txs = ['c2', 'p', 'd', 'e', 'f', 'g', 'h'].map((c, i) => f(`t${i}`, 'expense', (7 - i) * 1000, '2026-10-01', c));
    const out = expensesByCategory('2026-10', txs, cats, '2026-10-25', 4);
    expect(out).toHaveLength(4);
    expect(out[3]).toEqual({ categoryId: null, amount: 4000 + 3000 + 2000 + 1000 });
  });

  it('liste les derniers mois, mois courant inclus', () => {
    expect(lastMonths('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('série mensuelle et évolution du solde', () => {
    const txs: Transaction[] = [
      f('1', 'income', 200000, '2026-09-01', 'i'),
      f('2', 'expense', 50000, '2026-09-10', 'c2'),
      f('3', 'expense', 20000, '2026-10-10', 'c2'),
    ];
    const months = lastMonths('2026-10', 3);
    expect(monthlySeries(months, txs, cats, '2026-10-25').map((m) => [m.income, m.expenses])).toEqual([[0, 0], [200000, 50000], [0, 20000]]);
    expect(balanceSeries(months, [a], txs, '2026-10-25').map((p) => p.balance)).toEqual([100000, 250000, 230000]);
  });
});
