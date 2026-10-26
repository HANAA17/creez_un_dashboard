import type { SQLiteDatabase } from 'expo-sqlite';
import { todayIso } from '../domain';

type Migration = string | ((db: SQLiteDatabase) => Promise<void>);

/**
 * v3 : enveloppes. Les anciens « versements » et « retraits » d'épargne (transactions sur une catégorie d'épargne)
 * deviennent des répartitions ; les planifications d'épargne sont retirées. Les anciens budgets mensuels
 * deviennent le plan mensuel (même table).
 */
async function toEnvelopes(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE allocations (id TEXT PRIMARY KEY, date TEXT NOT NULL, category_id TEXT NOT NULL,
      amount INTEGER NOT NULL, group_id TEXT, note TEXT);
    CREATE INDEX idx_allocations_category ON allocations(category_id);
  `);
  const ids = (await db.getAllAsync<{ id: string }>("SELECT id FROM categories WHERE kind = 'savings'")).map((r) => r.id);
  let converted = 0;
  let removedRules = 0;
  if (ids.length > 0) {
    const marks = ids.map(() => '?').join(',');
    const txs = await db.getAllAsync<{ id: string; type: string; amount: number; date: string; category_id: string }>(
      `SELECT id, type, amount, date, category_id FROM transactions WHERE category_id IN (${marks})`, ids);
    for (const t of txs) {
      await db.runAsync('INSERT INTO allocations (id, date, category_id, amount, group_id, note) VALUES (?,?,?,?,NULL,?)',
        [`mig-${t.id}`, t.date, t.category_id, t.type === 'expense' ? t.amount : -t.amount, 'Migration épargne']);
    }
    converted = txs.length;
    await db.runAsync(`DELETE FROM transactions WHERE category_id IN (${marks})`, ids);
    for (const r of await db.getAllAsync<{ id: string; template: string }>('SELECT id, template FROM recurrences')) {
      const tpl = JSON.parse(r.template);
      if (tpl.categoryId && ids.includes(tpl.categoryId)) {
        await db.runAsync('DELETE FROM recurrences WHERE id = ?', [r.id]);
        removedRules++;
      }
    }
  }
  await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('envelopes_start', ?)", [todayIso()]);
  // On prévient les personnes qui avaient déjà des données (et pas une installation neuve).
  const used = await db.getFirstAsync<{ n: number }>('SELECT (SELECT COUNT(*) FROM accounts) + (SELECT COUNT(*) FROM transactions) AS n');
  if (converted > 0 || removedRules > 0 || (used?.n ?? 0) > 0) {
    await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_notice', ?)", [JSON.stringify({ converted, removedRules })]);
  }
}

const MIGRATIONS: Migration[] = [
  `
  CREATE TABLE accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
    initial_balance INTEGER NOT NULL, archived INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL,
    parent_id TEXT, archived INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE transactions (id TEXT PRIMARY KEY, type TEXT NOT NULL, amount INTEGER NOT NULL,
    date TEXT NOT NULL, note TEXT, account_id TEXT, category_id TEXT, to_account_id TEXT, recurrence_id TEXT);
  CREATE INDEX idx_transactions_date ON transactions(date);
  CREATE TABLE budgets (category_id TEXT PRIMARY KEY, amount INTEGER NOT NULL);
  CREATE TABLE goals (id TEXT PRIMARY KEY, name TEXT NOT NULL, category_id TEXT NOT NULL,
    target INTEGER NOT NULL, target_date TEXT);
  CREATE TABLE recurrences (id TEXT PRIMARY KEY, template TEXT NOT NULL, frequency TEXT NOT NULL,
    interval INTEGER NOT NULL, start_date TEXT NOT NULL, end_date TEXT, last_generated TEXT);
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `,
  // v2 : icône et couleur des catégories, pause des planifications.
  `
  ALTER TABLE categories ADD COLUMN icon TEXT;
  ALTER TABLE categories ADD COLUMN color TEXT;
  ALTER TABLE recurrences ADD COLUMN paused INTEGER NOT NULL DEFAULT 0;
  `,
  toEnvelopes,
];

/** Applique les migrations manquantes ; la version est suivie par PRAGMA user_version. */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      const step = MIGRATIONS[v]!;
      if (typeof step === 'string') await db.execAsync(step);
      else await step(db);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
