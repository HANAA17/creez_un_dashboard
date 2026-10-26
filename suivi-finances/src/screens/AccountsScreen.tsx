import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { accountBalance, currencySymbol, parseBalance, totalBalance, type Account, type AccountType } from '../domain';
import { useData } from '../state/DataContext';
import { ACCOUNT_LOOK } from '../ui/accountLook';
import { Button, Card, Empty, Field, IconBubble, Money, Screen, Segmented, SectionTitle, Txt, rowStyle } from '../ui/components';
import { useSeriesColors } from '../ui/palette';
import { useTheme } from '../ui/theme';
import { AccountEditor } from './AccountEditor';

const TYPES: Array<[AccountType, string]> = [['checking', 'Courant'], ['savings', 'Épargne'], ['cash', 'Espèces']];

export function AccountsScreen() {
  const { data, today, addAccount, setAccountArchived } = useData();
  const colors = useSeriesColors();
  const t = useTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [initial, setInitial] = useState('');
  const [editing, setEditing] = useState<Account | null>(null);

  const active = data.accounts.filter((a) => !a.archived);
  const archived = data.accounts.filter((a) => a.archived);

  const create = async () => {
    const initialBalance = parseBalance(initial);
    if (!name.trim()) return Alert.alert('Nom manquant', 'Donne un nom à ce compte.');
    if (initialBalance === null) return Alert.alert('Solde invalide', 'Exemple : 1250,50 (ou -80 si le compte est à découvert).');
    await addAccount({ name, type, initialBalance });
    setName(''); setInitial('');
  };

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
          <Pressable key={a.id} onPress={() => setEditing(a)} accessibilityRole="button" accessibilityLabel={`Modifier ${a.name}`}>
            <Card>
              <View style={[rowStyle, { gap: 12, paddingVertical: 0 }]}>
                <IconBubble icon={l.icon} color={colors[l.color]} size={42} />
                <View style={{ flex: 1 }}>
                  <Txt bold>{a.name}</Txt>
                  <Txt sub size={13}>{l.label}</Txt>
                </View>
                <Money cents={accountBalance(a, data.transactions, today)} bold />
                <Ionicons name="chevron-forward" size={18} color={t.sub} />
              </View>
            </Card>
          </Pressable>
        );
      })}
      {active.length > 0 && <Txt sub size={12} style={{ textAlign: 'center' }}>Touche un compte pour le modifier, l'archiver ou le supprimer.</Txt>}

      <SectionTitle>Nouveau compte</SectionTitle>
      <Card>
        <Field label="Nom" value={name} onChangeText={setName} placeholder="Compte courant, Livret A..." />
        <Segmented options={TYPES} value={type} onChange={setType} />
        <Field label={`Solde actuel (${currencySymbol()})`} value={initial} onChangeText={setInitial} keyboardType="numbers-and-punctuation" placeholder="0,00" />
        <Button title="Créer le compte" onPress={create} />
      </Card>

      {archived.length > 0 && (
        <>
          <SectionTitle>Archivés</SectionTitle>
          <Card>
            {archived.map((a) => (
              <View key={a.id} style={rowStyle}>
                <Pressable onPress={() => setEditing(a)} style={{ flex: 1 }}><Txt sub>{a.name}</Txt></Pressable>
                <Button title="Restaurer" variant="ghost" onPress={() => setAccountArchived(a.id, false)} />
              </View>
            ))}
          </Card>
        </>
      )}

      <AccountEditor account={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}
