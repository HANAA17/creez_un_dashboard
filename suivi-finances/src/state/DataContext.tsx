import * as SQLite from 'expo-sqlite';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { parseBackup, serializeBackup, type Data } from '../backup';
import * as repo from '../db/repository';
import { migrate } from '../db/schema';
import {
  generateDue, pauseRule, resumeRule, setCurrency as applyCurrency, todayIso, transferEntries, validateTransaction,
  type Account, type AccountType, type Allocation, type Category, type CategoryKind, type Cents, type Currency,
  type EnvelopeData, type Frequency, type IsoDate, type RecurrenceRule, type Transaction, type TransactionTemplate,
} from '../domain';

const EMPTY: Data = {
  accounts: [], categories: [], transactions: [], budgets: [], goals: [], recurrences: [], allocations: [], envelopesStart: todayIso(),
};

const DEFAULT_CATEGORIES: Array<[string, CategoryKind, string, string]> = [
  ['Logement', 'expense', 'home', 'blue'], ['Courses', 'expense', 'cart', 'green'],
  ['Transport', 'expense', 'car', 'orange'], ['Loisirs', 'expense', 'game-controller', 'violet'],
  ['Santé', 'expense', 'medkit', 'red'], ['Abonnements', 'expense', 'repeat', 'aqua'],
  ['Restaurants', 'expense', 'restaurant', 'yellow'], ['Autres dépenses', 'expense', 'pricetag', 'gray'],
  ['Salaire', 'income', 'briefcase', 'green'], ['Autres revenus', 'income', 'cash', 'blue'],
];

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const today = todayIso;

export type NewTransaction = TransactionTemplate & { date: IsoDate; repeat?: Frequency | null };

export interface NewCategory { name: string; kind: CategoryKind; icon?: string; color?: string }
export interface NewRecurrence {
  template: TransactionTemplate;
  frequency: Frequency;
  interval: number;
  startDate: IsoDate;
  endDate?: IsoDate;
}
export interface MigrationNotice { converted: number; removedRules: number }

interface Api {
  ready: boolean;
  data: Data;
  /** Données des enveloppes, prêtes pour les fonctions de calcul du domaine. */
  env: EnvelopeData;
  today: IsoDate;
  currency: Currency;
  lockEnabled: boolean;
  migrationNotice: MigrationNotice | null;

  addTransaction(input: NewTransaction): Promise<void>;
  /** Modifie une transaction existante (une échéance planifiée garde son lien avec sa planification). */
  updateTransaction(id: string, input: TransactionTemplate & { date: IsoDate }): Promise<void>;
  deleteTransaction(id: string): Promise<void>;

  addAccount(input: { name: string; type: AccountType; initialBalance: Cents }): Promise<void>;
  updateAccount(id: string, input: { name: string; type: AccountType; initialBalance: Cents }): Promise<void>;
  setAccountArchived(id: string, archived: boolean): Promise<void>;
  deleteAccount(id: string): Promise<void>;

  addCategory(input: NewCategory): Promise<Category>;
  updateCategory(id: string, changes: { name: string; icon?: string | null; color?: string | null }): Promise<void>;
  setCategoryArchived(id: string, archived: boolean): Promise<void>;
  deleteCategory(id: string, mode: repo.DeleteMode): Promise<void>;

  addRecurrence(input: NewRecurrence): Promise<void>;
  /** Modifie le modèle (montant, comptes, catégorie, note) et la date de fin ; le rythme reste celui de la création. */
  updateRecurrence(id: string, changes: { template: TransactionTemplate; endDate?: IsoDate }): Promise<void>;
  setRecurrencePaused(id: string, paused: boolean): Promise<void>;
  deleteRecurrence(id: string): Promise<void>;

  addGoal(input: { name: string; target: Cents; targetDate?: IsoDate; icon?: string; color?: string }): Promise<void>;
  updateGoal(id: string, input: { name: string; target: Cents; targetDate?: IsoDate }): Promise<void>;

  /** Met de l'argent « À répartir » dans des enveloppes. */
  allocate(entries: Array<{ categoryId: string; amount: Cents }>, note?: string): Promise<void>;
  /** Déplace de l'argent entre enveloppes ; null = « À répartir ». */
  transferBetween(input: { from: string | null; to: string | null; amount: Cents; note?: string }): Promise<void>;
  deleteAllocation(allocation: Allocation): Promise<void>;
  /** Remplace le plan mensuel (montant habituel par enveloppe) ; les montants nuls sont retirés. */
  savePlan(items: Array<{ categoryId: string; amount: Cents }>): Promise<void>;

  setCurrency(c: Currency): Promise<void>;
  setLockEnabled(on: boolean): Promise<void>;
  dismissMigrationNotice(): Promise<void>;
  exportBackup(): string;
  importBackup(text: string): Promise<void>;
}

const Ctx = createContext<Api | null>(null);

export function useData(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData doit être utilisé dans <DataProvider>');
  return v;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);
  const [data, setData] = useState<Data>(EMPTY);
  const [ready, setReady] = useState(false);
  const [lockEnabled, setLock] = useState(false);
  const [currency, setCurrencyState] = useState<Currency>('MAD');
  const [notice, setNotice] = useState<MigrationNotice | null>(null);
  const [day, setDay] = useState(todayIso());

  const reload = useCallback(async () => {
    const db = dbRef.current!;
    // Crée les échéances planifiées arrivées à terme, puis recharge.
    const current = await repo.loadAll(db);
    const upTo = todayIso();
    for (const rule of current.recurrences) {
      const { transactions, rule: updated } = generateDue(rule, upTo);
      if (transactions.length === 0) continue;
      await db.withTransactionAsync(async () => {
        for (const t of transactions) await repo.insertTransaction(db, t);
        await repo.saveRecurrence(db, updated);
      });
    }
    setData(await repo.loadAll(db));
    setDay(upTo);
  }, []);

  useEffect(() => {
    (async () => {
      const db = await SQLite.openDatabaseAsync('finances.db');
      dbRef.current = db;
      await migrate(db);
      if ((await repo.getSetting(db, 'seeded')) === null) {
        for (const [name, kind, icon, color] of DEFAULT_CATEGORIES) {
          await repo.insertCategory(db, { id: newId(), name, kind, parentId: null, archived: false, icon, color });
        }
        await repo.setSetting(db, 'seeded', '1');
      }
      const cur = ((await repo.getSetting(db, 'currency')) ?? 'MAD') as Currency;
      applyCurrency(cur);
      setCurrencyState(cur);
      setLock((await repo.getSetting(db, 'lock')) === '1');
      const raw = await repo.getSetting(db, 'migration_notice');
      if (raw) setNotice(JSON.parse(raw));
      await reload();
      setReady(true);
    })().catch((e) => console.error('Initialisation impossible', e));
    // Rattrape les échéances et le changement de jour au retour dans l'app.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && dbRef.current) reload();
    });
    return () => sub.remove();
  }, [reload]);

  const db = () => dbRef.current!;
  const check = (tx: Transaction) => {
    const errors = validateTransaction(tx, data.accounts, data.categories);
    if (errors.length > 0) throw new Error(errors.join('\n'));
  };

  const env = useMemo<EnvelopeData>(() => ({
    allocations: data.allocations, transactions: data.transactions, categories: data.categories, start: data.envelopesStart,
  }), [data]);

  const api: Api = {
    ready, data, env, today: day, currency, lockEnabled, migrationNotice: notice,

    async addTransaction({ repeat, date, ...template }) {
      const rule: RecurrenceRule | null = repeat
        ? { id: newId(), template, frequency: repeat, interval: 1, startDate: date }
        : null;
      check({ ...template, id: 'check', date } as Transaction);

      if (rule) {
        // La 1re échéance est créée tout de suite si sa date est déjà arrivée.
        const { transactions, rule: updated } = generateDue(rule, todayIso());
        await db().withTransactionAsync(async () => {
          await repo.saveRecurrence(db(), updated);
          for (const t of transactions) await repo.insertTransaction(db(), t);
        });
      } else {
        await repo.insertTransaction(db(), { ...template, id: newId(), date } as Transaction);
      }
      await reload();
    },

    async updateTransaction(id, { date, ...template }) {
      const existing = data.transactions.find((t) => t.id === id);
      if (!existing) throw new Error('Transaction introuvable.');
      const next = { ...template, id, date, recurrenceId: existing.recurrenceId } as Transaction;
      check(next);
      await repo.saveTransaction(db(), next);
      await reload();
    },

    async deleteTransaction(id) { await repo.deleteTransaction(db(), id); await reload(); },

    async addAccount({ name, type, initialBalance }) {
      const account: Account = { id: newId(), name: name.trim(), type, initialBalance, archived: false };
      await repo.insertAccount(db(), account);
      await reload();
    },

    async updateAccount(id, { name, type, initialBalance }) {
      if (!name.trim()) throw new Error('Donne un nom à ce compte.');
      await repo.updateAccount(db(), { id, name: name.trim(), type, initialBalance });
      await reload();
    },

    async setAccountArchived(id, archived) { await repo.setAccountArchived(db(), id, archived); await reload(); },
    async deleteAccount(id) { await repo.deleteAccount(db(), id); await reload(); },

    async addCategory({ name, kind, icon, color }) {
      const clean = name.trim();
      if (!clean) throw new Error('Donne un nom à la catégorie.');
      if (data.categories.some((c) => !c.archived && c.kind === kind && c.name.toLowerCase() === clean.toLowerCase())) {
        throw new Error(`Une catégorie « ${clean} » existe déjà.`);
      }
      const category: Category = { id: newId(), name: clean, kind, parentId: null, archived: false, icon: icon ?? null, color: color ?? null };
      await repo.insertCategory(db(), category);
      await reload();
      return category;
    },

    async updateCategory(id, { name, icon, color }) {
      const current = data.categories.find((c) => c.id === id);
      if (!current) throw new Error('Catégorie introuvable.');
      const clean = name.trim();
      if (!clean) throw new Error('Donne un nom à la catégorie.');
      if (data.categories.some((c) => c.id !== id && !c.archived && c.kind === current.kind && c.name.toLowerCase() === clean.toLowerCase())) {
        throw new Error(`Une catégorie « ${clean} » existe déjà.`);
      }
      await repo.updateCategory(db(), { id, name: clean, icon, color, archived: current.archived });
      // Un objectif porte le nom de sa catégorie d'épargne.
      const goal = data.goals.find((g) => g.categoryId === id);
      if (goal) await repo.updateGoal(db(), { id: goal.id, name: clean, target: goal.target, targetDate: goal.targetDate });
      await reload();
    },

    async setCategoryArchived(id, archived) {
      const current = data.categories.find((c) => c.id === id);
      if (!current) return;
      await repo.updateCategory(db(), { ...current, archived });
      await reload();
    },

    async deleteCategory(id, mode) {
      const cat = data.categories.find((c) => c.id === id);
      if (!cat) return;
      if (mode.type === 'move') {
        const target = data.categories.find((c) => c.id === mode.to);
        if (!target || target.kind !== cat.kind || target.id === id) throw new Error('Choisis une autre catégorie du même type.');
      }
      await repo.deleteCategory(db(), id, mode);
      await reload();
    },

    async addRecurrence({ template, frequency, interval, startDate, endDate }) {
      check({ ...template, id: 'check', date: startDate } as Transaction);
      if (!Number.isInteger(interval) || interval < 1) throw new Error("L'intervalle doit être d'au moins 1.");
      if (endDate && endDate < startDate) throw new Error('La date de fin doit être après la date de début.');
      const rule: RecurrenceRule = { id: newId(), template, frequency, interval, startDate, endDate };
      const { transactions, rule: updated } = generateDue(rule, todayIso());
      await db().withTransactionAsync(async () => {
        await repo.saveRecurrence(db(), updated);
        for (const t of transactions) await repo.insertTransaction(db(), t);
      });
      await reload();
    },

    async updateRecurrence(id, { template, endDate }) {
      const rule = data.recurrences.find((r) => r.id === id);
      if (!rule) throw new Error('Planification introuvable.');
      check({ ...template, id: 'check', date: rule.startDate } as Transaction);
      if (endDate && endDate < rule.startDate) throw new Error('La date de fin doit être après la date de début.');
      await repo.saveRecurrence(db(), { ...rule, template, endDate });
      await reload();
    },

    async setRecurrencePaused(id, paused) {
      const rule = data.recurrences.find((r) => r.id === id);
      if (!rule) return;
      await repo.saveRecurrence(db(), paused ? pauseRule(rule) : resumeRule(rule, todayIso()));
      await reload();
    },

    async deleteRecurrence(id) { await repo.deleteRecurrence(db(), id); await reload(); },

    /** Un objectif crée sa propre catégorie d'épargne : c'est son enveloppe. */
    async addGoal({ name, target, targetDate, icon, color }) {
      const categoryId = newId();
      await db().withTransactionAsync(async () => {
        await repo.insertCategory(db(), { id: categoryId, name: name.trim(), kind: 'savings', parentId: null, archived: false, icon: icon ?? null, color: color ?? null });
        await repo.insertGoal(db(), { id: newId(), name: name.trim(), categoryId, target, targetDate });
      });
      await reload();
    },

    async updateGoal(id, { name, target, targetDate }) {
      const goal = data.goals.find((g) => g.id === id);
      if (!goal) throw new Error('Objectif introuvable.');
      if (!name.trim()) throw new Error("Donne un nom à l'objectif.");
      const cat = data.categories.find((c) => c.id === goal.categoryId);
      await db().withTransactionAsync(async () => {
        await repo.updateGoal(db(), { id, name: name.trim(), target, targetDate });
        if (cat) await repo.updateCategory(db(), { ...cat, name: name.trim() });
      });
      await reload();
    },

    async allocate(entries, note) {
      const date = todayIso();
      const rows = entries.filter((e) => e.amount !== 0);
      await db().withTransactionAsync(async () => {
        for (const e of rows) await repo.insertAllocation(db(), { id: newId(), date, categoryId: e.categoryId, amount: e.amount, groupId: null, note });
      });
      await reload();
    },

    async transferBetween({ from, to, amount, note }) {
      if (!Number.isInteger(amount) || amount <= 0) throw new Error('Le montant doit être supérieur à 0.');
      if (from === to) throw new Error('Choisis deux enveloppes différentes.');
      const entries = transferEntries(from, to, amount, todayIso(), newId(), [newId(), newId()], note);
      await db().withTransactionAsync(async () => {
        for (const a of entries) await repo.insertAllocation(db(), a);
      });
      await reload();
    },

    async deleteAllocation(allocation) { await repo.deleteAllocation(db(), allocation.id, allocation.groupId); await reload(); },

    async savePlan(items) {
      await db().withTransactionAsync(async () => {
        for (const b of data.budgets) await repo.deleteBudget(db(), b.categoryId);
        for (const i of items) if (i.amount > 0) await repo.upsertBudget(db(), i);
      });
      await reload();
    },

    async setCurrency(c) {
      await repo.setSetting(db(), 'currency', c);
      applyCurrency(c);
      setCurrencyState(c);
      await reload();
    },

    async setLockEnabled(on) { await repo.setSetting(db(), 'lock', on ? '1' : '0'); setLock(on); },

    async dismissMigrationNotice() { await repo.deleteSetting(db(), 'migration_notice'); setNotice(null); },

    exportBackup: () => serializeBackup(data),

    async importBackup(text) {
      const { data: parsed, upgrade } = parseBackup(text, todayIso());
      await repo.replaceAll(db(), parsed);
      if (upgrade && (upgrade.converted > 0 || upgrade.removedRecurrences > 0)) {
        setNotice({ converted: upgrade.converted, removedRules: upgrade.removedRecurrences });
      }
      await reload();
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
