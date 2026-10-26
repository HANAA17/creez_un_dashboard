import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { accountBalance, parseBalance, totalBalance, type AccountType } from '../domain';
import { useData } from '../state/DataContext';
import { ACCOUNT_LOOK } from '../ui/accountLook';
import { Button, Card, Empty, Field, IconBubble, Money, Screen, Segmented, SectionTitle, Txt, rowStyle } from '../ui/components';
import { useSeriesColors } from '../ui/palette';

const TYPES: Array<[AccountType, string]> = [['checking', 'Courant'], ['savings', 'Épargne'], ['cash', 'Espèces']];

export function AccountsScreen() {
  const { data, today, addAccount, setAccountArchived } = useData();
  const colors = useSeriesColors();
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
    Alert.alert(`Archiver « ${label} » ?`, 'Le compte disparaît des listes mais son historique est conservé. Tu pourras le restaurer.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Archiver', onPress: () => setAccountArchived(id, true) },
    ]);

  return (
    <Screen>
      {active.length === 0 && <Empty>Crée ton premier compte pour commencer.</Empty>}
      {active.length > 1 && (
        <Card>
          <Txt sub size={13}>Total</Txt>
          <Money cents={totalBalance(data.accounts, data.transactions, today)} size={24} bold />
        </Card>
      )}
      {active.map((a) => {
        const l = ACCOUNT_LOOK[a.type];
        return (
          <Card key={a.id}>
            <View style={[rowStyle, { gap: 12 }]}>
              <IconBubble icon={l.icon} color={colors[l.color]} size={42} />
              <View style={{ flex: 1 }}>
                <Txt bold>{a.name}</Txt>
                <Txt sub size={13}>{l.label}</Txt>
              </View>
              <Money cents={accountBalance(a, data.transactions, today)} bold />
            </View>
            <Button title="Archiver" variant="ghost" onPress={() => confirmArchive(a.id, a.name)} />
          </Card>
        );
      })}

      <SectionTitle>Nouveau compte</SectionTitle>
      <Card>
        <Field label="Nom" value={name} onChangeText={setName} placeholder="Compte courant, Livret A..." />
        <Segmented options={TYPES} value={type} onChange={setType} />
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
