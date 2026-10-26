import React, { useState } from 'react';
import { View } from 'react-native';
import { monthKey, monthSummary } from '../domain';
import { useData } from '../state/DataContext';
import { Card, Empty, Money, Screen, Txt, rowStyle } from '../ui/components';
import { dayLabel } from '../ui/format';
import { MonthNav } from '../ui/MonthNav';
import { useUi } from '../ui/Ui';
import { TransactionRow } from '../ui/TransactionRow';

export function TransactionsScreen() {
  const { data, today } = useData();
  const { openAdd } = useUi();
  const [month, setMonth] = useState(monthKey(today));

  const list = data.transactions.filter((tx) => monthKey(tx.date) === month);
  const days = [...new Set(list.map((tx) => tx.date))].sort().reverse();
  const s = monthSummary(month, data.transactions, data.categories, today, data.allocations);

  return (
    <Screen>
      <Card>
        <MonthNav month={month} onChange={setMonth} />
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
            {list.filter((tx) => tx.date === day).map((tx, i) => (
              <TransactionRow key={tx.id} tx={tx} divider={i > 0} onPress={() => openAdd({ editId: tx.id })} />
            ))}
          </Card>
        </View>
      ))}
      <Txt sub size={12} style={{ textAlign: 'center' }}>Touche une transaction pour la modifier ou la supprimer.</Txt>
    </Screen>
  );
}
