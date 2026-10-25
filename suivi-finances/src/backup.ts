import type { Account, Budget, Category, Goal, RecurrenceRule, Transaction } from './domain';

export interface Data {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  recurrences: RecurrenceRule[];
}

const VERSION = 1;
const KEYS = ['accounts', 'categories', 'transactions', 'budgets', 'goals', 'recurrences'] as const;

export function serializeBackup(data: Data, now = new Date()): string {
  return JSON.stringify({ app: 'suivi-finances', version: VERSION, exportedAt: now.toISOString(), data }, null, 2);
}

/** Lit une sauvegarde ; lève une erreur lisible si le fichier n'est pas valide. */
export function parseBackup(text: string): Data {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde valide.");
  }
  if (raw?.app !== 'suivi-finances' || typeof raw.data !== 'object' || raw.data === null) {
    throw new Error("Ce fichier n'est pas une sauvegarde de Mes Finances.");
  }
  if (raw.version > VERSION) throw new Error("Cette sauvegarde vient d'une version plus récente de l'app.");
  const out: any = {};
  for (const k of KEYS) {
    if (!Array.isArray(raw.data[k])) throw new Error(`Sauvegarde incomplète : « ${k} » manquant.`);
    out[k] = raw.data[k];
  }
  const ids = new Set<string>();
  for (const t of out.transactions as Transaction[]) {
    if (!Number.isInteger(t.amount) || t.amount <= 0) throw new Error('Sauvegarde invalide : montant incorrect.');
    if (ids.has(t.id)) throw new Error('Sauvegarde invalide : transactions en double.');
    ids.add(t.id);
  }
  return out as Data;
}
