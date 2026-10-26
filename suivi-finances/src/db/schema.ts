import type { SQLiteDatabase } from 'expo-sqlite';

const MIGRATIONS: string[] = [
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
];

/** Applique les migrations manquantes ; la version est suivie par PRAGMA user_version. */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]!);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
