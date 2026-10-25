import * as SQLite from 'expo-sqlite';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { parseBackup, serializeBackup, type Data } from '../backup';
import * as repo from '../db/repository';
import { migrate } from '../db/schema';
import {
  generateDue, validateTransaction,
  type Account, type AccountType, type Cents, type Category, type CategoryKind, type Frequency,
  type IsoDate, type RecurrenceRule, type Transaction, type TransactionTemplate,
} from '../domain';

const EMPTY: Data = { accounts: [], categories: [], transactions: [], budgets: [], goals: [], recurrences: [] };

const DEFAULT_CATEGORIES: Array<[string, CategoryKind]> = [
  ['Logement', 'expense'], ['Courses', 'expense'], ['Transport', 'expense'], ['Loisirs', 'expense'],
  ['Santé', 'expense'], ['Abonnements', 'expense'], ['Restaurants', 'expense'], ['Autres dépenses', 'expense'],
  ['Salaire', 'income'], ['Autres revenus', 'income'],
];

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Date du jour dans le fuseau du téléphone (et non en UTC). */
export function today(): IsoDate {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type NewTransaction = TransactionTemplate & { date: IsoDate; repeat?: Frequency | null };

interface Api {
  ready: boolean;
  data: Data;
  today: IsoDate;
  lockEnabled: boolean;
  addTransaction(input: NewTransaction): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  addAccount(input: { name: string; type: AccountType; initialBalance: Cents }): Promise<void>;
  setAccountArchived(id: string, archived: boolean): Promise<void>;
  addCategory(name: string, kind: CategoryKind): Promise<Category>;
  setBudget(categoryId: string, amount: Cents): Promise<void>;
  removeBudget(categoryId: string): Promise<void>;
  addGoal(input: { name: string; target: Cents; targetDate?: IsoDate }): Promise<void>;
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
        for (const [name, kind] of DEFAULT_CATEGORIES) {
          await repo.insertCategory(db, { id: newId(), name, kind, parentId: null, archived: false });
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

    async addCategory(name, kind) {
      const category: Category = { id: newId(), name: name.trim(), kind, parentId: null, archived: false };
      await repo.insertCategory(db(), category);
      await reload();
      return category;
    },

    async setBudget(categoryId, amount) { await repo.upsertBudget(db(), { categoryId, amount }); await reload(); },
    async removeBudget(categoryId) { await repo.deleteBudget(db(), categoryId); await reload(); },

    /** Un objectif crée sa propre catégorie d'épargne : c'est ce lien qui alimente sa progression. */
    async addGoal({ name, target, targetDate }) {
      const categoryId = newId();
      await db().withTransactionAsync(async () => {
        await repo.insertCategory(db(), { id: categoryId, name: name.trim(), kind: 'savings', parentId: null, archived: false });
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
