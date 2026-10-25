import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { monthKey, monthSummary, type Transaction } from '../domain';
import { useData } from '../state/DataContext';
import { Button, Card, Empty, Money, Screen, Txt, rowStyle } from '../ui/components';
import { dayLabel, monthLabel, shiftMonth } from '../ui/format';
import { useTheme } from '../ui/theme';

export function TransactionsScreen() {
  const { data, today, deleteTransaction } = useData();
  const t = useTheme();
  const [month, setMonth] = useState(monthKey(today));

  const accountName = (id: string) => data.accounts.find((a) => a.id === id)?.name ?? '?';
  const category = (id: string) => data.categories.find((c) => c.id === id);

  const list = data.transactions.filter((tx) => monthKey(tx.date) === month);
  const days = [...new Set(list.map((tx) => tx.date))].sort().reverse();
  const s = monthSummary(month, data.transactions, data.categories, today);

  const confirmDelete = (tx: Transaction) =>
    Alert.alert('Supprimer cette transaction ?', tx.recurrenceId ? 'Seule cette échéance sera supprimée, la planification continue.' : undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteTransaction(tx.id) },
    ]);

  const describe = (tx: Transaction) => {
    if (tx.type === 'transfer') return { title: 'Virement', sub: `${accountName(tx.fromAccountId)} → ${accountName(tx.toAccountId)}` };
    const c = category(tx.categoryId);
    const savings = c?.kind === 'savings';
    return {
      title: savings ? `${c?.name} · ${tx.type === 'expense' ? 'versement' : 'retrait'}` : (c?.name ?? '?'),
      sub: [accountName(tx.accountId), tx.note].filter(Boolean).join(' · '),
    };
  };

  return (
    <Screen>
      <Card>
        <View style={rowStyle}>
          <Button title="‹" variant="ghost" onPress={() => setMonth(shiftMonth(month, -1))} />
          <Txt bold>{monthLabel(month)}</Txt>
          <Button title="›" variant="ghost" onPress={() => setMonth(shiftMonth(month, 1))} />
        </View>
        <View style={rowStyle}><Txt sub>Revenus</Txt><Money cents={s.income} signed /></View>
        <View style={rowStyle}><Txt sub>Dépenses</Txt><Money cents={-s.expenses} signed /></View>
      </Card>

      {days.length === 0 && <Empty>Aucune transaction ce mois-ci.</Empty>}
      {days.map((day) => (
        <View key={day}>
          <Txt sub size={13} style={{ marginBottom: 6, marginLeft: 4 }}>
            {dayLabel(day)}{day > today ? ' · prévue' : ''}
          </Txt>
          <Card style={{ paddingVertical: 4, opacity: day > today ? 0.7 : 1 }}>
            {list.filter((tx) => tx.date === day).map((tx, i) => {
              const { title, sub } = describe(tx);
              return (
                <Pressable key={tx.id} onPress={() => confirmDelete(tx)}
                  style={[rowStyle, i > 0 && { borderTopWidth: 0.5, borderTopColor: t.border }]}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Txt>{title}</Txt>
                    {!!sub && <Txt sub size={13}>{sub}</Txt>}
                  </View>
                  {tx.type === 'transfer'
                    ? <Money cents={tx.amount} />
                    : <Money cents={tx.type === 'income' ? tx.amount : -tx.amount} signed />}
                </Pressable>
              );
            })}
          </Card>
        </View>
      ))}
      <Txt sub size={12} style={{ textAlign: 'center' }}>Touche une ligne pour la supprimer.</Txt>
    </Screen>
  );
}
