/** Montants stockés en centimes (entiers) pour éviter les erreurs d'arrondi. */
export type Cents = number;
/** Date au format AAAA-MM-JJ, sans heure ni fuseau. */
export type IsoDate = string;

export type AccountType = 'checking' | 'savings' | 'cash';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: Cents;
  archived: boolean;
}

/**
 * - expense / income : catégories classiques
 * - savings : catégorie d'épargne, rattachée à un objectif.
 *   Dépense (type 'expense') = versement, revenu (type 'income') = retrait.
 */
export type CategoryKind = 'expense' | 'income' | 'savings';

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  parentId?: string | null;
  archived: boolean;
  /** Nom d'icône (voir src/ui/icons.ts) ; une valeur par défaut est déduite si absent. */
  icon?: string | null;
  /** Clé de couleur de la palette (voir src/ui/palette.ts), ex. 'blue'. */
  color?: string | null;
}

interface TransactionBase {
  id: string;
  /** Toujours strictement positif ; le sens vient du type. */
  amount: Cents;
  date: IsoDate;
  note?: string;
  /** Renseigné si la transaction vient d'une planification. */
  recurrenceId?: string;
}

export interface Flow extends TransactionBase {
  type: 'expense' | 'income';
  accountId: string;
  categoryId: string;
}

export interface Transfer extends TransactionBase {
  type: 'transfer';
  fromAccountId: string;
  toAccountId: string;
}

export type Transaction = Flow | Transfer;

export interface Budget {
  categoryId: string;
  /** Plafond mensuel (mois civil, du 1er au dernier jour). */
  amount: Cents;
}

export interface Goal {
  id: string;
  name: string;
  /** Catégorie de type 'savings' qui alimente cet objectif. */
  categoryId: string;
  target: Cents;
  targetDate?: IsoDate;
}

export type Frequency = 'weekly' | 'monthly' | 'yearly';

/** Modèle de transaction, sans id ni date. */
export type TransactionTemplate =
  | Omit<Flow, 'id' | 'date' | 'recurrenceId'>
  | Omit<Transfer, 'id' | 'date' | 'recurrenceId'>;

export interface RecurrenceRule {
  id: string;
  template: TransactionTemplate;
  frequency: Frequency;
  /** Toutes les N périodes (1 = chaque mois, 2 = un mois sur deux...). */
  interval: number;
  startDate: IsoDate;
  endDate?: IsoDate;
  /** Dernière échéance déjà transformée en transaction. */
  lastGenerated?: IsoDate;
  /** En pause : aucune échéance n'est créée tant que la règle n'est pas reprise. */
  paused?: boolean;
}
