import type { SQLiteDatabase } from 'expo-sqlite';
import type { Data } from '../backup';
import type {
  Account, Budget, Category, Flow, Goal, RecurrenceRule, Transaction, TransactionTemplate, Transfer,
} from '../domain';

type Row = Record<string, any>;

export async function loadAll(db: SQLiteDatabase): Promise<Data> {
  const [accounts, categories, txs, budgets, goals, recs] = await Promise.all([
    db.getAllAsync<Row>('SELECT * FROM accounts ORDER BY rowid'),
    db.getAllAsync<Row>('SELECT * FROM categories ORDER BY rowid'),
    db.getAllAsync<Row>('SELECT * FROM transactions ORDER BY date DESC, rowid DESC'),
    db.getAllAsync<Row>('SELECT * FROM budgets'),
    db.getAllAsync<Row>('SELECT * FROM goals ORDER BY rowid'),
    db.getAllAsync<Row>('SELECT * FROM recurrences ORDER BY rowid'),
  ]);
  return {
    accounts: accounts.map((r): Account => ({
      id: r.id, name: r.name, type: r.type, initialBalance: r.initial_balance, archived: !!r.archived,
    })),
    categories: categories.map((r): Category => ({
      id: r.id, name: r.name, kind: r.kind, parentId: r.parent_id, archived: !!r.archived,
      icon: r.icon ?? null, color: r.color ?? null,
    })),
    transactions: txs.map((r): Transaction => {
      const base = { id: r.id, amount: r.amount, date: r.date, note: r.note ?? undefined, recurrenceId: r.recurrence_id ?? undefined };
      return r.type === 'transfer'
        ? ({ ...base, type: 'transfer', fromAccountId: r.account_id, toAccountId: r.to_account_id } as Transfer)
        : ({ ...base, type: r.type, accountId: r.account_id, categoryId: r.category_id } as Flow);
    }),
    budgets: budgets.map((r): Budget => ({ categoryId: r.category_id, amount: r.amount })),
    goals: goals.map((r): Goal => ({
      id: r.id, name: r.name, categoryId: r.category_id, target: r.target, targetDate: r.target_date ?? undefined,
    })),
    recurrences: recs.map((r): RecurrenceRule => ({
      id: r.id, template: JSON.parse(r.template) as TransactionTemplate, frequency: r.frequency,
      interval: r.interval, startDate: r.start_date, endDate: r.end_date ?? undefined, lastGenerated: r.last_generated ?? undefined,
      paused: !!r.paused,
    })),
  };
}

export const insertAccount = (db: SQLiteDatabase, a: Account) =>
  db.runAsync('INSERT INTO accounts (id, name, type, initial_balance, archived) VALUES (?,?,?,?,?)',
    [a.id, a.name, a.type, a.initialBalance, a.archived ? 1 : 0]);

export const setAccountArchived = (db: SQLiteDatabase, id: string, archived: boolean) =>
  db.runAsync('UPDATE accounts SET archived = ? WHERE id = ?', [archived ? 1 : 0, id]);

export const insertCategory = (db: SQLiteDatabase, c: Category) =>
  db.runAsync('INSERT INTO categories (id, name, kind, parent_id, archived, icon, color) VALUES (?,?,?,?,?,?,?)',
    [c.id, c.name, c.kind, c.parentId ?? null, c.archived ? 1 : 0, c.icon ?? null, c.color ?? null]);

export const updateCategory = (db: SQLiteDatabase, c: Pick<Category, 'id' | 'name' | 'icon' | 'color' | 'archived'>) =>
  db.runAsync('UPDATE categories SET name = ?, icon = ?, color = ?, archived = ? WHERE id = ?',
    [c.name, c.icon ?? null, c.color ?? null, c.archived ? 1 : 0, c.id]);

/** INSERT OR IGNORE : une échéance planifiée déjà créée n'est jamais dupliquée. */
export const insertTransaction = (db: SQLiteDatabase, t: Transaction) =>
  db.runAsync(
    `INSERT OR IGNORE INTO transactions (id, type, amount, date, note, account_id, category_id, to_account_id, recurrence_id)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    t.type === 'transfer'
      ? [t.id, t.type, t.amount, t.date, t.note ?? null, t.fromAccountId, null, t.toAccountId, t.recurrenceId ?? null]
      : [t.id, t.type, t.amount, t.date, t.note ?? null, t.accountId, t.categoryId, null, t.recurrenceId ?? null],
  );

export const deleteTransaction = (db: SQLiteDatabase, id: string) =>
  db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);

export const upsertBudget = (db: SQLiteDatabase, b: Budget) =>
  db.runAsync('INSERT OR REPLACE INTO budgets (category_id, amount) VALUES (?,?)', [b.categoryId, b.amount]);

export const deleteBudget = (db: SQLiteDatabase, categoryId: string) =>
  db.runAsync('DELETE FROM budgets WHERE category_id = ?', [categoryId]);

export const insertGoal = (db: SQLiteDatabase, g: Goal) =>
  db.runAsync('INSERT INTO goals (id, name, category_id, target, target_date) VALUES (?,?,?,?,?)',
    [g.id, g.name, g.categoryId, g.target, g.targetDate ?? null]);

export const saveRecurrence = (db: SQLiteDatabase, r: RecurrenceRule) =>
  db.runAsync(
    'INSERT OR REPLACE INTO recurrences (id, template, frequency, interval, start_date, end_date, last_generated, paused) VALUES (?,?,?,?,?,?,?,?)',
    [r.id, JSON.stringify(r.template), r.frequency, r.interval, r.startDate, r.endDate ?? null, r.lastGenerated ?? null, r.paused ? 1 : 0],
  );

export const deleteRecurrence = (db: SQLiteDatabase, id: string) =>
  db.runAsync('DELETE FROM recurrences WHERE id = ?', [id]);

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export const setSetting = (db: SQLiteDatabase, key: string, value: string) =>
  db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)', [key, value]);

/** Remplace toutes les données (import d'une sauvegarde), en une seule transaction. */
export async function replaceAll(db: SQLiteDatabase, data: Data): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const t of ['transactions', 'recurrences', 'goals', 'budgets', 'categories', 'accounts']) {
      await db.runAsync(`DELETE FROM ${t}`);
    }
    for (const a of data.accounts) await insertAccount(db, a);
    for (const c of data.categories) await insertCategory(db, c);
    for (const t of data.transactions) await insertTransaction(db, t);
    for (const b of data.budgets) await upsertBudget(db, b);
    for (const g of data.goals) await insertGoal(db, g);
    for (const r of data.recurrences) await saveRecurrence(db, r);
  });
}
