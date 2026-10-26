import type { SQLiteDatabase } from 'expo-sqlite';
import type { Data } from '../backup';
import type {
  Account, Allocation, Budget, Category, Flow, Goal, RecurrenceRule, Transaction, TransactionTemplate, Transfer,
} from '../domain';
import { todayIso } from '../domain';

type Row = Record<string, any>;

export async function loadAll(db: SQLiteDatabase): Promise<Data> {
  const [accounts, categories, txs, budgets, goals, recs, allocs, start] = await Promise.all([
    db.getAllAsync<Row>('SELECT * FROM accounts ORDER BY rowid'),
    db.getAllAsync<Row>('SELECT * FROM categories ORDER BY rowid'),
    db.getAllAsync<Row>('SELECT * FROM transactions ORDER BY date DESC, rowid DESC'),
    db.getAllAsync<Row>('SELECT * FROM budgets'),
    db.getAllAsync<Row>('SELECT * FROM goals ORDER BY rowid'),
    db.getAllAsync<Row>('SELECT * FROM recurrences ORDER BY rowid'),
    db.getAllAsync<Row>('SELECT * FROM allocations ORDER BY date DESC, rowid DESC'),
    getSetting(db, 'envelopes_start'),
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
    allocations: allocs.map((r): Allocation => ({
      id: r.id, date: r.date, categoryId: r.category_id, amount: r.amount, groupId: r.group_id ?? null, note: r.note ?? undefined,
    })),
    envelopesStart: start ?? todayIso(),
  };
}

// --- Comptes -------------------------------------------------------------------------------------------------

export const insertAccount = (db: SQLiteDatabase, a: Account) =>
  db.runAsync('INSERT INTO accounts (id, name, type, initial_balance, archived) VALUES (?,?,?,?,?)',
    [a.id, a.name, a.type, a.initialBalance, a.archived ? 1 : 0]);

export const updateAccount = (db: SQLiteDatabase, a: Pick<Account, 'id' | 'name' | 'type' | 'initialBalance'>) =>
  db.runAsync('UPDATE accounts SET name = ?, type = ?, initial_balance = ? WHERE id = ?', [a.name, a.type, a.initialBalance, a.id]);

export const setAccountArchived = (db: SQLiteDatabase, id: string, archived: boolean) =>
  db.runAsync('UPDATE accounts SET archived = ? WHERE id = ?', [archived ? 1 : 0, id]);

const ruleTouchesAccount = (tpl: TransactionTemplate, id: string) =>
  tpl.type === 'transfer' ? tpl.fromAccountId === id || tpl.toAccountId === id : tpl.accountId === id;

/** Supprime le compte, ses transactions (virements compris) et les planifications qui l'utilisent. */
export async function deleteAccount(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM transactions WHERE account_id = ? OR to_account_id = ?', [id, id]);
    for (const r of await db.getAllAsync<Row>('SELECT id, template FROM recurrences')) {
      if (ruleTouchesAccount(JSON.parse(r.template), id)) await db.runAsync('DELETE FROM recurrences WHERE id = ?', [r.id]);
    }
    await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
  });
}

// --- Catégories ----------------------------------------------------------------------------------------------

export const insertCategory = (db: SQLiteDatabase, c: Category) =>
  db.runAsync('INSERT INTO categories (id, name, kind, parent_id, archived, icon, color) VALUES (?,?,?,?,?,?,?)',
    [c.id, c.name, c.kind, c.parentId ?? null, c.archived ? 1 : 0, c.icon ?? null, c.color ?? null]);

export const updateCategory = (db: SQLiteDatabase, c: Pick<Category, 'id' | 'name' | 'icon' | 'color' | 'archived'>) =>
  db.runAsync('UPDATE categories SET name = ?, icon = ?, color = ?, archived = ? WHERE id = ?',
    [c.name, c.icon ?? null, c.color ?? null, c.archived ? 1 : 0, c.id]);

export type DeleteMode = { type: 'move'; to: string } | { type: 'purge' };

const templateCategory = (tpl: TransactionTemplate): string | null => (tpl.type === 'transfer' ? null : tpl.categoryId);

/**
 * Supprime une catégorie.
 * - move : transactions, répartitions (donc l'argent de l'enveloppe), planifications et plan mensuel passent à une autre catégorie.
 * - purge : tout ce qui s'y rattache est supprimé ; l'argent de l'enveloppe retourne dans « À répartir ».
 * Un éventuel objectif d'épargne lié à la catégorie est supprimé dans les deux cas.
 */
export async function deleteCategory(db: SQLiteDatabase, id: string, mode: DeleteMode): Promise<void> {
  await db.withTransactionAsync(async () => {
    const rules = await db.getAllAsync<Row>('SELECT id, template FROM recurrences');
    if (mode.type === 'move') {
      await db.runAsync('UPDATE transactions SET category_id = ? WHERE category_id = ?', [mode.to, id]);
      await db.runAsync('UPDATE allocations SET category_id = ? WHERE category_id = ?', [mode.to, id]);
      for (const r of rules) {
        const tpl = JSON.parse(r.template);
        if (templateCategory(tpl) === id) {
          await db.runAsync('UPDATE recurrences SET template = ? WHERE id = ?', [JSON.stringify({ ...tpl, categoryId: mode.to }), r.id]);
        }
      }
      const old = await db.getFirstAsync<Row>('SELECT amount FROM budgets WHERE category_id = ?', [id]);
      if (old) {
        await db.runAsync(
          'INSERT INTO budgets (category_id, amount) VALUES (?, ?) ON CONFLICT(category_id) DO UPDATE SET amount = amount + excluded.amount',
          [mode.to, old.amount]);
      }
    } else {
      await db.runAsync('DELETE FROM transactions WHERE category_id = ?', [id]);
      await db.runAsync('DELETE FROM allocations WHERE category_id = ?', [id]);
      for (const r of rules) {
        if (templateCategory(JSON.parse(r.template)) === id) await db.runAsync('DELETE FROM recurrences WHERE id = ?', [r.id]);
      }
    }
    await db.runAsync('DELETE FROM budgets WHERE category_id = ?', [id]);
    await db.runAsync('DELETE FROM goals WHERE category_id = ?', [id]);
    await db.runAsync('UPDATE categories SET parent_id = NULL WHERE parent_id = ?', [id]);
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  });
}

// --- Transactions --------------------------------------------------------------------------------------------

const txParams = (t: Transaction) =>
  t.type === 'transfer'
    ? [t.id, t.type, t.amount, t.date, t.note ?? null, t.fromAccountId, null, t.toAccountId, t.recurrenceId ?? null]
    : [t.id, t.type, t.amount, t.date, t.note ?? null, t.accountId, t.categoryId, null, t.recurrenceId ?? null];

const TX_SQL = `INTO transactions (id, type, amount, date, note, account_id, category_id, to_account_id, recurrence_id)
     VALUES (?,?,?,?,?,?,?,?,?)`;

/** INSERT OR IGNORE : une échéance planifiée déjà créée n'est jamais dupliquée. */
export const insertTransaction = (db: SQLiteDatabase, t: Transaction) => db.runAsync(`INSERT OR IGNORE ${TX_SQL}`, txParams(t));

/** Remplace une transaction existante (modification). */
export const saveTransaction = (db: SQLiteDatabase, t: Transaction) => db.runAsync(`INSERT OR REPLACE ${TX_SQL}`, txParams(t));

export const deleteTransaction = (db: SQLiteDatabase, id: string) =>
  db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);

// --- Plan mensuel, objectifs, répartitions -------------------------------------------------------------------

export const upsertBudget = (db: SQLiteDatabase, b: Budget) =>
  db.runAsync('INSERT OR REPLACE INTO budgets (category_id, amount) VALUES (?,?)', [b.categoryId, b.amount]);

export const deleteBudget = (db: SQLiteDatabase, categoryId: string) =>
  db.runAsync('DELETE FROM budgets WHERE category_id = ?', [categoryId]);

export const insertGoal = (db: SQLiteDatabase, g: Goal) =>
  db.runAsync('INSERT INTO goals (id, name, category_id, target, target_date) VALUES (?,?,?,?,?)',
    [g.id, g.name, g.categoryId, g.target, g.targetDate ?? null]);

export const updateGoal = (db: SQLiteDatabase, g: Pick<Goal, 'id' | 'name' | 'target' | 'targetDate'>) =>
  db.runAsync('UPDATE goals SET name = ?, target = ?, target_date = ? WHERE id = ?', [g.name, g.target, g.targetDate ?? null, g.id]);

export const insertAllocation = (db: SQLiteDatabase, a: Allocation) =>
  db.runAsync('INSERT OR REPLACE INTO allocations (id, date, category_id, amount, group_id, note) VALUES (?,?,?,?,?,?)',
    [a.id, a.date, a.categoryId, a.amount, a.groupId ?? null, a.note ?? null]);

/** Supprime une répartition ; si elle fait partie d'un transfert, les deux lignes disparaissent ensemble. */
export const deleteAllocation = (db: SQLiteDatabase, id: string, groupId?: string | null) =>
  groupId
    ? db.runAsync('DELETE FROM allocations WHERE group_id = ?', [groupId])
    : db.runAsync('DELETE FROM allocations WHERE id = ?', [id]);

// --- Planifications ------------------------------------------------------------------------------------------

export const saveRecurrence = (db: SQLiteDatabase, r: RecurrenceRule) =>
  db.runAsync(
    'INSERT OR REPLACE INTO recurrences (id, template, frequency, interval, start_date, end_date, last_generated, paused) VALUES (?,?,?,?,?,?,?,?)',
    [r.id, JSON.stringify(r.template), r.frequency, r.interval, r.startDate, r.endDate ?? null, r.lastGenerated ?? null, r.paused ? 1 : 0],
  );

export const deleteRecurrence = (db: SQLiteDatabase, id: string) =>
  db.runAsync('DELETE FROM recurrences WHERE id = ?', [id]);

// --- Réglages ------------------------------------------------------------------------------------------------

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export const setSetting = (db: SQLiteDatabase, key: string, value: string) =>
  db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)', [key, value]);

export const deleteSetting = (db: SQLiteDatabase, key: string) =>
  db.runAsync('DELETE FROM settings WHERE key = ?', [key]);

/** Remplace toutes les données (import d'une sauvegarde), en une seule transaction. */
export async function replaceAll(db: SQLiteDatabase, data: Data): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const t of ['transactions', 'recurrences', 'goals', 'budgets', 'allocations', 'categories', 'accounts']) {
      await db.runAsync(`DELETE FROM ${t}`);
    }
    for (const a of data.accounts) await insertAccount(db, a);
    for (const c of data.categories) await insertCategory(db, c);
    for (const t of data.transactions) await insertTransaction(db, t);
    for (const b of data.budgets) await upsertBudget(db, b);
    for (const g of data.goals) await insertGoal(db, g);
    for (const r of data.recurrences) await saveRecurrence(db, r);
    for (const a of data.allocations) await insertAllocation(db, a);
    await setSetting(db, 'envelopes_start', data.envelopesStart);
    await setSetting(db, 'seeded', '1');
  });
}
