import React, { useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { currencySymbol, parseBalance, type Account, type AccountType } from '../domain';
import { useData } from '../state/DataContext';
import { Button, Field, Screen, Segmented, Txt, rowStyle } from '../ui/components';

const TYPES: Array<[AccountType, string]> = [['checking', 'Courant'], ['savings', 'Épargne'], ['cash', 'Espèces']];

/** Modification d'un compte : nom, type, solde de départ ; archivage ou suppression. */
export function AccountEditor({ account, onClose }: { account: Account | null; onClose: () => void }) {
  return (
    <Modal visible={account !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {account !== null && <Form account={account} onClose={onClose} />}
    </Modal>
  );
}

function Form({ account, onClose }: { account: Account; onClose: () => void }) {
  const { data, updateAccount, setAccountArchived, deleteAccount } = useData();
  const [name, setName] = useState(account.name);
  const [type, setType] = useState<AccountType>(account.type);
  const [initial, setInitial] = useState((account.initialBalance / 100).toFixed(2).replace('.', ','));
  const [busy, setBusy] = useState(false);

  const txCount = data.transactions.filter((t) => (t.type === 'transfer' ? t.fromAccountId === account.id || t.toAccountId === account.id : t.accountId === account.id)).length;
  const ruleCount = data.recurrences.filter((r) => (r.template.type === 'transfer' ? r.template.fromAccountId === account.id || r.template.toAccountId === account.id : r.template.accountId === account.id)).length;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); onClose(); } catch (e) {
      Alert.alert('Action impossible', e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const save = () => {
    const initialBalance = parseBalance(initial);
    if (!name.trim()) return Alert.alert('Nom manquant', 'Donne un nom à ce compte.');
    if (initialBalance === null) return Alert.alert('Solde invalide', 'Exemple : 1250,50 (ou -80 si le compte est à découvert).');
    return run(() => updateAccount(account.id, { name, type, initialBalance }));
  };

  const remove = () => {
    if (txCount === 0 && ruleCount === 0) {
      return Alert.alert(`Supprimer « ${account.name} » ?`, undefined, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => run(() => deleteAccount(account.id)) },
      ]);
    }
    return Alert.alert(
      `Supprimer « ${account.name} » ?`,
      `Ce compte a ${txCount} transaction${txCount > 1 ? 's' : ''} et ${ruleCount} planification${ruleCount > 1 ? 's' : ''}. ` +
        'Les supprimer change aussi les comptes liés par des virements. Tu peux plutôt archiver le compte : il disparaît des listes et son historique reste.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Archiver', onPress: () => run(() => setAccountArchived(account.id, true)) },
        { text: 'Tout supprimer', style: 'destructive', onPress: () => run(() => deleteAccount(account.id)) },
      ],
    );
  };

  return (
    <Screen>
      <View style={rowStyle}>
        <Txt bold size={20}>Modifier le compte</Txt>
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </View>
      <Field label="Nom" value={name} onChangeText={setName} />
      <Segmented options={TYPES} value={type} onChange={setType} />
      <Field label={`Solde de départ (${currencySymbol()})`} value={initial} onChangeText={setInitial} keyboardType="numbers-and-punctuation" />
      <Txt sub size={12} style={{ marginTop: -6, marginBottom: 6 }}>Le solde affiché = solde de départ + toutes les transactions. Modifier le solde de départ ajuste le solde d'autant.</Txt>
      <Button title="Enregistrer" onPress={save} disabled={busy} />
      <Button title="Archiver" variant="ghost" onPress={() => run(() => setAccountArchived(account.id, true))} disabled={busy} />
      <Button title="Supprimer le compte" variant="danger" onPress={remove} disabled={busy} />
    </Screen>
  );
}
