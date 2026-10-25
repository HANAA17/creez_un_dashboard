import type { Account, Category, Transaction } from './types';

/** Retourne la liste des erreurs ; vide si la transaction est valide. */
export function validateTransaction(
  tx: Transaction,
  accounts: Account[],
  categories: Category[],
): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(tx.amount) || tx.amount <= 0) errors.push('Le montant doit être supérieur à 0.');

  const account = (id: string) => accounts.find((a) => a.id === id);

  if (tx.type === 'transfer') {
    if (tx.fromAccountId === tx.toAccountId) errors.push('Les deux comptes du virement doivent être différents.');
    for (const id of [tx.fromAccountId, tx.toAccountId]) {
      const a = account(id);
      if (!a) errors.push('Compte introuvable.');
      else if (a.archived) errors.push(`Le compte « ${a.name} » est archivé.`);
    }
    return errors;
  }

  const a = account(tx.accountId);
  if (!a) errors.push('Compte introuvable.');
  else if (a.archived) errors.push(`Le compte « ${a.name} » est archivé.`);

  const c = categories.find((x) => x.id === tx.categoryId);
  if (!c) errors.push('Catégorie introuvable.');
  else {
    if (c.archived) errors.push(`La catégorie « ${c.name} » est archivée.`);
    // Une catégorie d'épargne accepte versements (expense) et retraits (income).
    if (c.kind !== 'savings' && c.kind !== tx.type) {
      errors.push(`La catégorie « ${c.name} » ne convient pas à une transaction de type ${tx.type === 'expense' ? 'dépense' : 'revenu'}.`);
    }
  }
  return errors;
}
