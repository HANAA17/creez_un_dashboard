import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { currencySymbol, parseAmount, type Frequency } from '../domain';
import { useData } from '../state/DataContext';
import { useUi, type AddPreset } from '../ui/Ui';
import { Button, Chip, ChipRow, Field, Screen, Segmented, Txt, rowStyle } from '../ui/components';
import { dateToIso, isoToDate } from '../ui/format';
import { CategoryChips } from './CategoryChips';

type Kind = 'expense' | 'income' | 'transfer';
const KINDS: Array<[Kind, string]> = [['expense', 'Dépense'], ['income', 'Revenu'], ['transfer', 'Virement']];
const REPEATS: Array<[Frequency | null, string]> = [
  [null, 'Non'], ['weekly', 'Chaque semaine'], ['monthly', 'Chaque mois'], ['yearly', 'Chaque année'],
];
const toInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

export function AddTransactionSheet() {
  const { addPreset, closeAdd } = useUi();
  return (
    <Modal visible={addPreset !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeAdd}>
      {addPreset !== null && <Form preset={addPreset} onClose={closeAdd} />}
    </Modal>
  );
}

/** Ajout d'une transaction, ou modification si `preset.editId` désigne une transaction existante. */
function Form({ preset, onClose }: { preset: AddPreset; onClose: () => void }) {
  const { data, addTransaction, updateTransaction, deleteTransaction } = useData();
  const accounts = data.accounts.filter((a) => !a.archived);
  const existing = preset.editId ? data.transactions.find((t) => t.id === preset.editId) : undefined;
  const editing = !!existing;

  const [kind, setKind] = useState<Kind>(existing?.type ?? preset.type ?? 'expense');
  const [amount, setAmount] = useState(existing ? toInput(existing.amount) : '');
  const [accountId, setAccountId] = useState(
    existing ? (existing.type === 'transfer' ? existing.fromAccountId : existing.accountId) : (accounts[0]?.id ?? ''),
  );
  const [toAccountId, setToAccountId] = useState(existing?.type === 'transfer' ? existing.toAccountId : (accounts[1]?.id ?? ''));
  const [categoryId, setCategoryId] = useState(existing && existing.type !== 'transfer' ? existing.categoryId : (preset.categoryId ?? ''));
  const [date, setDate] = useState(existing ? isoToDate(existing.date) : new Date());
  const [note, setNote] = useState(existing?.note ?? '');
  const [repeat, setRepeat] = useState<Frequency | null>(null);
  const [saving, setSaving] = useState(false);

  // La destination d'un virement ne peut jamais être le compte de départ.
  const destId = accounts.some((a) => a.id === toAccountId && a.id !== accountId)
    ? toAccountId
    : (accounts.find((a) => a.id !== accountId)?.id ?? '');

  // Une catégorie d'épargne n'accepte que des dépenses : payer quelque chose avec l'argent de l'objectif.
  const categories = data.categories.filter(
    (c) => !c.archived && kind !== 'transfer' && (c.kind === kind || (c.kind === 'savings' && kind === 'expense')),
  );
  const chosen = data.categories.find((c) => c.id === categoryId);
  const isSavings = chosen?.kind === 'savings';

  const changeKind = (k: Kind) => {
    setKind(k);
    const c = data.categories.find((x) => x.id === categoryId);
    if (c && c.kind !== k && !(c.kind === 'savings' && k === 'expense')) setCategoryId('');
  };

  const save = async () => {
    const cents = parseAmount(amount);
    if (cents === null) return Alert.alert('Montant invalide', 'Exemple : 12,50 (maximum 2 décimales).');
    if (!accountId) return Alert.alert('Compte manquant', "Crée d'abord un compte dans Plus › Comptes.");
    if (kind === 'transfer' && !destId) return Alert.alert('Compte manquant', 'Choisis le compte de destination.');
    if (kind !== 'transfer' && !categoryId) return Alert.alert('Catégorie manquante', 'Choisis une catégorie.');
    setSaving(true);
    try {
      const common = { amount: cents, date: dateToIso(date), note: note.trim() || undefined };
      const template = kind === 'transfer'
        ? { ...common, type: 'transfer' as const, fromAccountId: accountId, toAccountId: destId }
        : { ...common, type: kind, accountId, categoryId };
      if (existing) await updateTransaction(existing.id, template);
      else await addTransaction({ ...template, repeat });
      onClose();
    } catch (e) {
      Alert.alert("Impossible d'enregistrer", e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert('Supprimer cette transaction ?', existing?.recurrenceId ? 'Seule cette échéance sera supprimée, la planification continue.' : undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteTransaction(existing!.id); onClose(); } },
    ]);

  if (accounts.length === 0) {
    return (
      <Screen>
        <Txt bold size={20}>Aucun compte</Txt>
        <Txt sub>Crée d'abord un compte dans Plus › Comptes, puis reviens ajouter ta transaction.</Txt>
        <Button title="Fermer" onPress={onClose} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={rowStyle}>
        <Txt bold size={20}>{editing ? 'Modifier la transaction' : isSavings ? "Dépenser depuis l'épargne" : 'Nouvelle transaction'}</Txt>
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </View>

      {!editing && <Segmented options={KINDS} value={kind} onChange={changeKind} />}
      {existing?.recurrenceId && <Txt sub size={13}>Cette transaction vient d'une planification : seule cette échéance est modifiée.</Txt>}

      <Field label={`Montant (${currencySymbol()})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" autoFocus={!editing} />

      <Txt sub size={13} style={{ marginBottom: 6 }}>{kind === 'transfer' ? 'Depuis le compte' : 'Compte'}</Txt>
      <ChipRow>
        {accounts.map((a) => <Chip key={a.id} label={a.name} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />)}
      </ChipRow>

      {kind === 'transfer' ? (
        <>
          <Txt sub size={13} style={{ marginBottom: 6 }}>Vers le compte</Txt>
          <ChipRow>
            {accounts.filter((a) => a.id !== accountId).map((a) => (
              <Chip key={a.id} label={a.name} selected={destId === a.id} onPress={() => setToAccountId(a.id)} />
            ))}
          </ChipRow>
        </>
      ) : (
        <>
          <Txt sub size={13} style={{ marginBottom: 6 }}>Catégorie</Txt>
          <CategoryChips categories={categories} kind={kind} selectedId={categoryId} onSelect={setCategoryId} />
        </>
      )}

      <View style={[rowStyle, { marginBottom: 8 }]}>
        <Txt>Date</Txt>
        <DateTimePicker value={date} mode="date" display="compact" locale="fr-FR" onChange={(_, d) => d && setDate(d)} />
      </View>

      <Field label="Note (optionnel)" value={note} onChangeText={setNote} placeholder="Ex. courses du samedi" />

      {!editing && (
        <>
          <Txt sub size={13} style={{ marginBottom: 6 }}>Répéter</Txt>
          <ChipRow>
            {REPEATS.map(([f, label]) => <Chip key={label} label={label} selected={repeat === f} onPress={() => setRepeat(f)} />)}
          </ChipRow>
          {repeat && <Txt sub size={13} style={{ marginBottom: 12 }}>Tu pourras modifier, mettre en pause ou arrêter cette répétition dans Plus › Planifications.</Txt>}
        </>
      )}

      <Button title={saving ? 'Enregistrement…' : 'Enregistrer'} onPress={save} disabled={saving} />
      {editing && <Button title="Supprimer la transaction" variant="danger" onPress={remove} />}
    </Screen>
  );
}
