import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { parseAmount, type Frequency } from '../domain';
import { useData } from '../state/DataContext';
import { useUi, type AddPreset } from '../ui/Ui';
import { Button, Chip, ChipRow, Field, Screen, Txt, rowStyle } from '../ui/components';
import { dateToIso } from '../ui/format';

type Kind = 'expense' | 'income' | 'transfer';
const KINDS: Array<[Kind, string]> = [['expense', 'Dépense'], ['income', 'Revenu'], ['transfer', 'Virement']];
const REPEATS: Array<[Frequency | null, string]> = [
  [null, 'Non'], ['weekly', 'Chaque semaine'], ['monthly', 'Chaque mois'], ['yearly', 'Chaque année'],
];

export function AddTransactionSheet() {
  const { addPreset, closeAdd } = useUi();
  return (
    <Modal visible={addPreset !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeAdd}>
      {addPreset !== null && <Form preset={addPreset} onClose={closeAdd} />}
    </Modal>
  );
}

function Form({ preset, onClose }: { preset: AddPreset; onClose: () => void }) {
  const { data, addTransaction, addCategory } = useData();
  const accounts = data.accounts.filter((a) => !a.archived);

  const [kind, setKind] = useState<Kind>(preset.type ?? 'expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? '');
  const [categoryId, setCategoryId] = useState(preset.categoryId ?? '');
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [repeat, setRepeat] = useState<Frequency | null>(null);
  const [saving, setSaving] = useState(false);

  // La destination d'un virement ne peut jamais être le compte de départ.
  const destId = accounts.some((a) => a.id === toAccountId && a.id !== accountId)
    ? toAccountId
    : (accounts.find((a) => a.id !== accountId)?.id ?? '');

  // Une catégorie d'épargne convient aux dépenses (versement) comme aux revenus (retrait).
  const categories = data.categories.filter((c) => !c.archived && kind !== 'transfer' && (c.kind === 'savings' || c.kind === kind));
  const chosen = data.categories.find((c) => c.id === categoryId);
  const isSavings = chosen?.kind === 'savings';

  const changeKind = (k: Kind) => {
    setKind(k);
    const c = data.categories.find((x) => x.id === categoryId);
    if (c && c.kind !== 'savings' && c.kind !== k) setCategoryId('');
  };

  const newCategory = () =>
    Alert.prompt('Nouvelle catégorie', kind === 'income' ? 'Catégorie de revenu' : 'Catégorie de dépense', async (text) => {
      if (!text?.trim()) return;
      const c = await addCategory(text, kind === 'income' ? 'income' : 'expense');
      setCategoryId(c.id);
    });

  const save = async () => {
    const cents = parseAmount(amount);
    if (cents === null) return Alert.alert('Montant invalide', 'Exemple : 12,50 (maximum 2 décimales).');
    if (!accountId) return Alert.alert('Compte manquant', "Crée d'abord un compte dans l'onglet Comptes.");
    if (kind === 'transfer' && !destId) return Alert.alert('Compte manquant', 'Choisis le compte de destination.');
    if (kind !== 'transfer' && !categoryId) return Alert.alert('Catégorie manquante', 'Choisis une catégorie.');
    setSaving(true);
    try {
      const common = { amount: cents, date: dateToIso(date), note: note.trim() || undefined, repeat };
      await addTransaction(
        kind === 'transfer'
          ? { ...common, type: 'transfer', fromAccountId: accountId, toAccountId: destId }
          : { ...common, type: kind, accountId, categoryId },
      );
      onClose();
    } catch (e) {
      Alert.alert('Impossible d\'enregistrer', e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <Screen>
        <Txt bold size={20}>Aucun compte</Txt>
        <Txt sub>Crée d'abord un compte dans l'onglet Comptes, puis reviens ajouter ta transaction.</Txt>
        <Button title="Fermer" onPress={onClose} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={rowStyle}>
        <Txt bold size={20}>{isSavings ? (kind === 'expense' ? 'Verser en épargne' : 'Retirer de l\'épargne') : 'Nouvelle transaction'}</Txt>
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </View>

      <ChipRow>
        {KINDS.map(([k, label]) => <Chip key={k} label={label} selected={kind === k} onPress={() => changeKind(k)} />)}
      </ChipRow>

      <Field label="Montant (€)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" autoFocus />

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
          <ChipRow>
            {categories.map((c) => (
              <Chip key={c.id} label={c.kind === 'savings' ? `${c.name} · épargne` : c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
            <Chip label="+ Nouvelle" onPress={newCategory} />
          </ChipRow>
        </>
      )}

      <View style={[rowStyle, { marginBottom: 8 }]}>
        <Txt>Date</Txt>
        <DateTimePicker value={date} mode="date" display="compact" locale="fr-FR" onChange={(_, d) => d && setDate(d)} />
      </View>

      <Field label="Note (optionnel)" value={note} onChangeText={setNote} placeholder="Ex. courses du samedi" />

      <Txt sub size={13} style={{ marginBottom: 6 }}>Répéter</Txt>
      <ChipRow>
        {REPEATS.map(([f, label]) => <Chip key={label} label={label} selected={repeat === f} onPress={() => setRepeat(f)} />)}
      </ChipRow>

      <Button title={saving ? 'Enregistrement…' : 'Enregistrer'} onPress={save} disabled={saving} />
    </Screen>
  );
}
