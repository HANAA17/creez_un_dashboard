import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Alert, Modal, Switch, View } from 'react-native';
import { currencySymbol, parseAmount, upcomingOccurrences, type Frequency, type RecurrenceRule } from '../domain';
import { useData } from '../state/DataContext';
import { Button, Card, Chip, ChipRow, Field, Screen, Segmented, SectionTitle, Txt, rowStyle } from '../ui/components';
import { dateToIso, frequencyLabel, isoToDate, shortDate } from '../ui/format';
import { CategoryChips } from './CategoryChips';

type Kind = 'expense' | 'income' | 'transfer';
const KINDS: Array<[Kind, string]> = [['expense', 'Dépense'], ['income', 'Revenu'], ['transfer', 'Virement']];
const FREQS: Array<[Frequency, string]> = [['weekly', 'Semaine'], ['monthly', 'Mois'], ['yearly', 'Année']];
const UNIT: Record<Frequency, string> = { weekly: 'semaine(s)', monthly: 'mois', yearly: 'an(s)' };

const toInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

/** Création ou modification d'un revenu / d'une dépense / d'un virement récurrent. */
export function RecurrenceEditor({ visible, rule, onClose }: { visible: boolean; rule?: RecurrenceRule | null; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible && <Form rule={rule ?? null} onClose={onClose} />}
    </Modal>
  );
}

function Form({ rule, onClose }: { rule: RecurrenceRule | null; onClose: () => void }) {
  const { data, today, addRecurrence, updateRecurrence, setRecurrencePaused, deleteRecurrence } = useData();
  const accounts = data.accounts.filter((a) => !a.archived);
  const editing = rule !== null;
  const tpl = rule?.template;

  const [kind, setKind] = useState<Kind>(tpl?.type ?? 'expense');
  const [amount, setAmount] = useState(tpl ? toInput(tpl.amount) : '');
  const [accountId, setAccountId] = useState(tpl ? (tpl.type === 'transfer' ? tpl.fromAccountId : tpl.accountId) : (accounts[0]?.id ?? ''));
  const [toAccountId, setToAccountId] = useState(tpl?.type === 'transfer' ? tpl.toAccountId : (accounts[1]?.id ?? ''));
  const [categoryId, setCategoryId] = useState(tpl && tpl.type !== 'transfer' ? tpl.categoryId : '');
  const [note, setNote] = useState(tpl?.note ?? '');
  const [frequency, setFrequency] = useState<Frequency>(rule?.frequency ?? 'monthly');
  const [interval, setIntervalN] = useState(rule?.interval ?? 1);
  const [start, setStart] = useState(rule ? isoToDate(rule.startDate) : new Date());
  const [hasEnd, setHasEnd] = useState(!!rule?.endDate);
  const [end, setEnd] = useState(rule?.endDate ? isoToDate(rule.endDate) : isoToDate(today));
  const [saving, setSaving] = useState(false);

  const destId = accounts.some((a) => a.id === toAccountId && a.id !== accountId)
    ? toAccountId
    : (accounts.find((a) => a.id !== accountId)?.id ?? '');
  const categories = data.categories.filter((c) => !c.archived && kind !== 'transfer' && (c.kind === kind || (c.kind === 'savings' && kind === 'expense')));

  const changeKind = (k: Kind) => {
    setKind(k);
    const c = data.categories.find((x) => x.id === categoryId);
    if (c && c.kind !== k && !(c.kind === 'savings' && k === 'expense')) setCategoryId('');
  };

  const preview = upcomingOccurrences(
    { id: 'preview', template: { type: 'expense', amount: 1, accountId: '', categoryId: '' }, frequency, interval, startDate: dateToIso(start), endDate: hasEnd ? dateToIso(end) : undefined },
    today, 3,
  );

  const save = async () => {
    const cents = parseAmount(amount);
    if (cents === null) return Alert.alert('Montant invalide', 'Exemple : 800 ou 49,90 (maximum 2 décimales).');
    if (!accountId) return Alert.alert('Compte manquant', "Crée d'abord un compte dans Plus › Comptes.");
    if (kind !== 'transfer' && !categoryId) return Alert.alert('Catégorie manquante', 'Choisis une catégorie.');
    if (kind === 'transfer' && !destId) return Alert.alert('Compte manquant', 'Choisis le compte de destination.');
    const common = { amount: cents, note: note.trim() || undefined };
    const template = kind === 'transfer'
      ? { ...common, type: 'transfer' as const, fromAccountId: accountId, toAccountId: destId }
      : { ...common, type: kind, accountId, categoryId };
    const endDate = hasEnd ? dateToIso(end) : undefined;
    setSaving(true);
    try {
      if (rule) await updateRecurrence(rule.id, { template, endDate });
      else await addRecurrence({ template, frequency, interval, startDate: dateToIso(start), endDate });
      onClose();
    } catch (e) {
      Alert.alert("Impossible d'enregistrer", e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Supprimer cette planification ?', 'Les transactions déjà créées sont conservées, mais plus aucune ne sera ajoutée.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteRecurrence(rule!.id); onClose(); } },
    ]);

  return (
    <Screen>
      <View style={rowStyle}>
        <Txt bold size={20}>{editing ? 'Modifier la planification' : 'Nouvelle planification'}</Txt>
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </View>

      {editing
        ? <Txt sub size={13}>Le type, le rythme et la date de début ne changent plus après création. Pour les modifier, supprime la planification et recrée-la.</Txt>
        : <Segmented options={KINDS} value={kind} onChange={changeKind} />}

      <Field label={`Montant (${currencySymbol()})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" />

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

      <Field label="Note (optionnel)" value={note} onChangeText={setNote} placeholder="Ex. loyer, salaire, Netflix…" />

      <SectionTitle>Rythme</SectionTitle>
      {editing ? (
        <Card><Txt>{frequencyLabel(rule!.frequency, rule!.interval)}, depuis le {shortDate(rule!.startDate)}</Txt></Card>
      ) : (
        <Card>
          <Segmented options={FREQS} value={frequency} onChange={setFrequency} />
          <View style={rowStyle}>
            <Txt>Tous les</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Button title="−" variant="ghost" onPress={() => setIntervalN(Math.max(1, interval - 1))} />
              <Txt bold>{interval} {UNIT[frequency]}</Txt>
              <Button title="+" variant="ghost" onPress={() => setIntervalN(Math.min(60, interval + 1))} />
            </View>
          </View>
          <View style={rowStyle}>
            <Txt>Première date</Txt>
            <DateTimePicker value={start} mode="date" display="compact" locale="fr-FR" onChange={(_, d) => d && setStart(d)} />
          </View>
        </Card>
      )}

      <Card>
        <View style={rowStyle}>
          <Txt>Date de fin</Txt>
          <Switch value={hasEnd} onValueChange={setHasEnd} />
        </View>
        {hasEnd && (
          <DateTimePicker value={end} mode="date" display="compact" locale="fr-FR" onChange={(_, d) => d && setEnd(d)} style={{ alignSelf: 'flex-start' }} />
        )}
      </Card>

      <Card>
        <Txt sub size={13}>Prochaines dates</Txt>
        <Txt>{preview.length === 0 ? 'Aucune échéance à venir' : preview.map(shortDate).join('  ·  ')}</Txt>
      </Card>

      <Button title={saving ? 'Enregistrement…' : 'Enregistrer'} onPress={save} disabled={saving} />
      {editing && (
        <>
          <Button title={rule!.paused ? 'Reprendre' : 'Mettre en pause'} variant="ghost"
            onPress={async () => { await setRecurrencePaused(rule!.id, !rule!.paused); onClose(); }} />
          {rule!.paused && <Txt sub size={13} style={{ textAlign: 'center' }}>À la reprise, les échéances manquées pendant la pause sont ignorées.</Txt>}
          <Button title="Supprimer la planification" variant="danger" onPress={confirmDelete} />
        </>
      )}
    </Screen>
  );
}
