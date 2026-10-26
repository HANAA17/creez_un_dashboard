import * as SQLite from 'expo-sqlite';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { parseBackup, serializeBackup, type Data } from '../backup';
import * as repo from '../db/repository';
import { migrate } from '../db/schema';
import {
  generateDue, pauseRule, resumeRule, validateTransaction,
  type Account, type AccountType, type Cents, type Category, type CategoryKind, type Frequency,
  type IsoDate, type RecurrenceRule, type Transaction, type TransactionTemplate,
} from '../domain';

const EMPTY: Data = { accounts: [], categories: [], transactions: [], budgets: [], goals: [], recurrences: [] };

const DEFAULT_CATEGORIES: Array<[string, CategoryKind, string, string]> = [
  ['Logement', 'expense', 'home', 'blue'], ['Courses', 'expense', 'cart', 'green'],
  ['Transport', 'expense', 'car', 'orange'], ['Loisirs', 'expense', 'game-controller', 'violet'],
  ['Santé', 'expense', 'medkit', 'red'], ['Abonnements', 'expense', 'repeat', 'aqua'],
  ['Restaurants', 'expense', 'restaurant', 'yellow'], ['Autres dépenses', 'expense', 'pricetag', 'gray'],
  ['Salaire', 'income', 'briefcase', 'green'], ['Autres revenus', 'income', 'cash', 'blue'],
];

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Date du jour dans le fuseau du téléphone (et non en UTC). */
export function today(): IsoDate {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type NewTransaction = TransactionTemplate & { date: IsoDate; repeat?: Frequency | null };

export interface NewCategory { name: string; kind: CategoryKind; icon?: string; color?: string }
export interface NewRecurrence {
  template: TransactionTemplate;
  frequency: Frequency;
  interval: number;
  startDate: IsoDate;
  endDate?: IsoDate;
}

interface Api {
  ready: boolean;
  data: Data;
  today: IsoDate;
  lockEnabled: boolean;
  addTransaction(input: NewTransaction): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  addAccount(input: { name: string; type: AccountType; initialBalance: Cents }): Promise<void>;
  setAccountArchived(id: string, archived: boolean): Promise<void>;
  addCategory(input: NewCategory): Promise<Category>;
  updateCategory(id: string, changes: { name: string; icon?: string | null; color?: string | null }): Promise<void>;
  setCategoryArchived(id: string, archived: boolean): Promise<void>;
  addRecurrence(input: NewRecurrence): Promise<void>;
  /** Modifie le modèle (montant, comptes, catégorie, note) et la date de fin ; le rythme reste celui de la création. */
  updateRecurrence(id: string, changes: { template: TransactionTemplate; endDate?: IsoDate }): Promise<void>;
  setRecurrencePaused(id: string, paused: boolean): Promise<void>;
  setBudget(categoryId: string, amount: Cents): Promise<void>;
  removeBudget(categoryId: string): Promise<void>;
  addGoal(input: { name: string; target: Cents; targetDate?: IsoDate; icon?: string; color?: string }): Promise<void>;
  deleteRecurrence(id: string): Promise<void>;
  setLockEnabled(on: boolean): Promise<void>;
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
  const [day, setDay] = useState(today());

  const reload = useCallback(async () => {
    const db = dbRef.current!;
    // Crée les échéances planifiées arrivées à terme, puis recharge.
    const current = await repo.loadAll(db);
    const upTo = today();
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
      setLock((await repo.getSetting(db, 'lock')) === '1');
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

  const api: Api = {
    ready, data, today: day, lockEnabled,

    async addTransaction({ repeat, date, ...template }) {
      const rule: RecurrenceRule | null = repeat
        ? { id: newId(), template, frequency: repeat, interval: 1, startDate: date }
        : null;
      const candidate = { ...template, id: 'check', date } as Transaction;
      const errors = validateTransaction(candidate, data.accounts, data.categories);
      if (errors.length > 0) throw new Error(errors.join('\n'));

      if (rule) {
        // La 1re échéance est créée tout de suite si sa date est déjà arrivée.
        const { transactions, rule: updated } = generateDue(rule, today());
        await db().withTransactionAsync(async () => {
          await repo.saveRecurrence(db(), updated);
          for (const t of transactions) await repo.insertTransaction(db(), t);
        });
      } else {
        await repo.insertTransaction(db(), { ...template, id: newId(), date } as Transaction);
      }
      await reload();
    },

    async deleteTransaction(id) { await repo.deleteTransaction(db(), id); await reload(); },

    async addAccount({ name, type, initialBalance }) {
      const account: Account = { id: newId(), name: name.trim(), type, initialBalance, archived: false };
      await repo.insertAccount(db(), account);
      await reload();
    },

    async setAccountArchived(id, archived) { await repo.setAccountArchived(db(), id, archived); await reload(); },

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
      await reload();
    },

    async setCategoryArchived(id, archived) {
      const current = data.categories.find((c) => c.id === id);
      if (!current) return;
      await repo.updateCategory(db(), { ...current, archived });
      await reload();
    },

    async addRecurrence({ template, frequency, interval, startDate, endDate }) {
      const errors = validateTransaction({ ...template, id: 'check', date: startDate } as Transaction, data.accounts, data.categories);
      if (errors.length > 0) throw new Error(errors.join('\n'));
      if (!Number.isInteger(interval) || interval < 1) throw new Error("L'intervalle doit être d'au moins 1.");
      if (endDate && endDate < startDate) throw new Error('La date de fin doit être après la date de début.');
      const rule: RecurrenceRule = { id: newId(), template, frequency, interval, startDate, endDate };
      const { transactions, rule: updated } = generateDue(rule, today());
      await db().withTransactionAsync(async () => {
        await repo.saveRecurrence(db(), updated);
        for (const t of transactions) await repo.insertTransaction(db(), t);
      });
      await reload();
    },

    async updateRecurrence(id, { template, endDate }) {
      const rule = data.recurrences.find((r) => r.id === id);
      if (!rule) throw new Error('Planification introuvable.');
      const errors = validateTransaction({ ...template, id: 'check', date: rule.startDate } as Transaction, data.accounts, data.categories);
      if (errors.length > 0) throw new Error(errors.join('\n'));
      if (endDate && endDate < rule.startDate) throw new Error('La date de fin doit être après la date de début.');
      await repo.saveRecurrence(db(), { ...rule, template, endDate });
      await reload();
    },

    async setRecurrencePaused(id, paused) {
      const rule = data.recurrences.find((r) => r.id === id);
      if (!rule) return;
      await repo.saveRecurrence(db(), paused ? pauseRule(rule) : resumeRule(rule, today()));
      await reload();
    },

    async setBudget(categoryId, amount) { await repo.upsertBudget(db(), { categoryId, amount }); await reload(); },
    async removeBudget(categoryId) { await repo.deleteBudget(db(), categoryId); await reload(); },

    /** Un objectif crée sa propre catégorie d'épargne : c'est ce lien qui alimente sa progression. */
    async addGoal({ name, target, targetDate, icon, color }) {
      const categoryId = newId();
      await db().withTransactionAsync(async () => {
        await repo.insertCategory(db(), { id: categoryId, name: name.trim(), kind: 'savings', parentId: null, archived: false, icon: icon ?? null, color: color ?? null });
        await repo.insertGoal(db(), { id: newId(), name: name.trim(), categoryId, target, targetDate });
      });
      await reload();
    },

    async deleteRecurrence(id) { await repo.deleteRecurrence(db(), id); await reload(); },

    async setLockEnabled(on) { await repo.setSetting(db(), 'lock', on ? '1' : '0'); setLock(on); },

    exportBackup: () => serializeBackup(data),

    async importBackup(text) {
      await repo.replaceAll(db(), parseBackup(text));
      await reload();
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
