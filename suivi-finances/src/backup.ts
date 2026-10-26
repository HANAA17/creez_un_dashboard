import type { Account, Allocation, Budget, Category, IsoDate, Goal, RecurrenceRule, Transaction } from './domain';

export interface Data {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  /** Plan mensuel : montant habituel à répartir dans chaque enveloppe. */
  budgets: Budget[];
  goals: Goal[];
  recurrences: RecurrenceRule[];
  allocations: Allocation[];
  /** Les dépenses antérieures à cette date ne vident aucune enveloppe. */
  envelopesStart: IsoDate;
}

const VERSION = 2;
const KEYS = ['accounts', 'categories', 'transactions', 'budgets', 'goals', 'recurrences'] as const;

export function serializeBackup(data: Data, now = new Date()): string {
  return JSON.stringify({ app: 'suivi-finances', version: VERSION, exportedAt: now.toISOString(), data }, null, 2);
}

export interface Upgrade { converted: number; removedRecurrences: number }

/**
 * Anciens modèles : l'épargne était alimentée par des transactions « versement » (dépense) et « retrait » (revenu)
 * sur une catégorie d'épargne. Désormais l'épargne est une enveloppe : ces transactions deviennent des répartitions
 * et disparaissent des comptes, et les planifications d'épargne sont retirées (à remplacer par le plan mensuel).
 */
export function migrateSavingsToEnvelopes(data: Omit<Data, 'allocations' | 'envelopesStart'> & Partial<Data>, today: IsoDate): { data: Data; upgrade: Upgrade } {
  const savings = new Set(data.categories.filter((c) => c.kind === 'savings').map((c) => c.id));
  const allocations: Allocation[] = [...(data.allocations ?? [])];
  const transactions: Transaction[] = [];
  let converted = 0;
  for (const tx of data.transactions) {
    if (tx.type !== 'transfer' && savings.has(tx.categoryId)) {
      allocations.push({
        id: `mig-${tx.id}`, date: tx.date, categoryId: tx.categoryId,
        amount: tx.type === 'expense' ? tx.amount : -tx.amount, groupId: null, note: 'Migration épargne',
      });
      converted++;
    } else {
      transactions.push(tx);
    }
  }
  const recurrences = data.recurrences.filter((r) => r.template.type === 'transfer' || !savings.has(r.template.categoryId));
  return {
    data: { ...data, transactions, recurrences, allocations, envelopesStart: data.envelopesStart ?? today },
    upgrade: { converted, removedRecurrences: data.recurrences.length - recurrences.length },
  };
}

/** Lit une sauvegarde (version 1 ou 2) ; lève une erreur lisible si le fichier n'est pas valide. */
export function parseBackup(text: string, today: IsoDate): { data: Data; upgrade: Upgrade | null } {
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

  if (raw.version >= 2) {
    if (!Array.isArray(raw.data.allocations)) throw new Error('Sauvegarde incomplète : « allocations » manquant.');
    for (const a of raw.data.allocations as Allocation[]) {
      if (!Number.isInteger(a.amount) || a.amount === 0) throw new Error('Sauvegarde invalide : répartition incorrecte.');
    }
    out.allocations = raw.data.allocations;
    out.envelopesStart = typeof raw.data.envelopesStart === 'string' ? raw.data.envelopesStart : today;
    return { data: out as Data, upgrade: null };
  }
  const { data, upgrade } = migrateSavingsToEnvelopes(out, today);
  return { data, upgrade };
}
