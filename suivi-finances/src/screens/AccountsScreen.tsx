import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { accountBalance, parseBalance, type AccountType } from '../domain';
import { useData } from '../state/DataContext';
import { Button, Card, Chip, ChipRow, Empty, Field, Money, Screen, SectionTitle, Txt, rowStyle } from '../ui/components';

const TYPES: Array<[AccountType, string]> = [['checking', 'Courant'], ['savings', 'Épargne'], ['cash', 'Espèces']];
const typeLabel = (t: AccountType) => TYPES.find(([k]) => k === t)![1];

export function AccountsScreen() {
  const { data, today, addAccount, setAccountArchived } = useData();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [initial, setInitial] = useState('');

  const active = data.accounts.filter((a) => !a.archived);
  const archived = data.accounts.filter((a) => a.archived);

  const create = async () => {
    const initialBalance = parseBalance(initial);
    if (!name.trim()) return Alert.alert('Nom manquant', 'Donne un nom à ce compte.');
    if (initialBalance === null) return Alert.alert('Solde invalide', 'Exemple : 1250,50 (ou -80 si le compte est à découvert).');
    await addAccount({ name, type, initialBalance });
    setName(''); setInitial('');
  };

  const confirmArchive = (id: string, label: string) =>
    Alert.alert(`Archiver « ${label} » ?`, "Le compte disparaît des listes mais son historique est conservé. Tu pourras le restaurer.", [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Archiver', onPress: () => setAccountArchived(id, true) },
    ]);

  return (
    <Screen>
      {active.length === 0 && <Empty>Crée ton premier compte pour commencer.</Empty>}
      {active.map((a) => (
        <Card key={a.id}>
          <View style={rowStyle}>
            <View>
              <Txt bold>{a.name}</Txt>
              <Txt sub size={13}>{typeLabel(a.type)}</Txt>
            </View>
            <Money cents={accountBalance(a, data.transactions, today)} bold />
          </View>
          <Button title="Archiver" variant="ghost" onPress={() => confirmArchive(a.id, a.name)} />
        </Card>
      ))}

      <SectionTitle>Nouveau compte</SectionTitle>
      <Card>
        <Field label="Nom" value={name} onChangeText={setName} placeholder="Compte courant, Livret A..." />
        <ChipRow>
          {TYPES.map(([k, label]) => <Chip key={k} label={label} selected={type === k} onPress={() => setType(k)} />)}
        </ChipRow>
        <Field label="Solde actuel (€)" value={initial} onChangeText={setInitial} keyboardType="numbers-and-punctuation" placeholder="0,00" />
        <Button title="Créer le compte" onPress={create} />
      </Card>

      {archived.length > 0 && (
        <>
          <SectionTitle>Archivés</SectionTitle>
          <Card>
            {archived.map((a) => (
              <View key={a.id} style={rowStyle}>
                <Txt sub>{a.name}</Txt>
                <Button title="Restaurer" variant="ghost" onPress={() => setAccountArchived(a.id, false)} />
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
