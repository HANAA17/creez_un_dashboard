import type { Account, Cents, IsoDate, Transaction } from './types';

/** Effet d'une transaction sur un compte donné (+ entrée, − sortie). */
function effectOn(accountId: string, tx: Transaction): Cents {
  if (tx.type === 'transfer') {
    if (tx.fromAccountId === accountId) return -tx.amount;
    if (tx.toAccountId === accountId) return tx.amount;
    return 0;
  }
  if (tx.accountId !== accountId) return 0;
  return tx.type === 'income' ? tx.amount : -tx.amount;
}

/**
 * Solde = solde initial + effet des transactions datées au plus tard de `asOf`.
 * Les transactions futures sont « prévues » et ne comptent pas encore.
 */
export function accountBalance(account: Account, txs: Transaction[], asOf: IsoDate): Cents {
  return txs.reduce(
    (sum, tx) => (tx.date <= asOf ? sum + effectOn(account.id, tx) : sum),
    account.initialBalance,
  );
}

/** Total de tous les comptes non archivés. Les virements internes s'annulent. */
export function totalBalance(accounts: Account[], txs: Transaction[], asOf: IsoDate): Cents {
  return accounts
    .filter((a) => !a.archived)
    .reduce((sum, a) => sum + accountBalance(a, txs, asOf), 0);
}
