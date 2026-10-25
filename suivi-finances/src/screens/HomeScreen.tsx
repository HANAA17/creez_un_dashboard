import React from 'react';
import { View } from 'react-native';
import { budgetStatus, formatAmount, monthKey, monthSummary, totalBalance } from '../domain';
import { useData } from '../state/DataContext';
import { Card, Empty, Money, ProgressBar, Screen, SectionTitle, Txt, rowStyle } from '../ui/components';
import { monthLabel } from '../ui/format';
import { useTheme } from '../ui/theme';

export function HomeScreen() {
  const { data, today } = useData();
  const t = useTheme();
  const month = monthKey(today);
  const total = totalBalance(data.accounts, data.transactions, today);
  const s = monthSummary(month, data.transactions, data.categories, today);
  const alerts = data.budgets
    .map((budget) => ({ budget, status: budgetStatus(budget, month, data.transactions, data.categories, today) }))
    .filter((x) => x.status.level !== 'ok');
  const nameOf = (id: string) => data.categories.find((c) => c.id === id)?.name ?? '?';

  return (
    <Screen>
      <Card>
        <Txt sub size={13}>Solde total</Txt>
        <Money cents={total} size={34} bold />
        <Txt sub size={13} style={{ marginTop: 4 }}>{data.accounts.filter((a) => !a.archived).length} compte(s)</Txt>
      </Card>

      <SectionTitle>{monthLabel(month)}</SectionTitle>
      <Card>
        <View style={rowStyle}><Txt>Revenus</Txt><Money cents={s.income} signed /></View>
        <View style={rowStyle}><Txt>Dépenses</Txt><Money cents={-s.expenses} signed /></View>
        <View style={rowStyle}><Txt>Mis de côté</Txt><Money cents={s.savedToGoals} /></View>
        <View style={rowStyle}>
          <Txt bold>Taux d'épargne</Txt>
          <Txt bold color={s.savingsRate !== null && s.savingsRate < 0 ? t.neg : t.text}>
            {s.savingsRate === null ? '–' : `${Math.round(s.savingsRate * 100)} %`}
          </Txt>
        </View>
      </Card>

      <SectionTitle>Alertes budget</SectionTitle>
      {alerts.length === 0 ? (
        <Empty>{data.budgets.length === 0 ? "Aucun budget défini. Ajoutes-en dans l'onglet Budgets." : 'Tous tes budgets sont sous contrôle.'}</Empty>
      ) : (
        alerts.map(({ budget, status }) => (
          <Card key={budget.categoryId}>
            <View style={rowStyle}>
              <Txt bold>{nameOf(budget.categoryId)}</Txt>
              <Txt color={status.level === 'exceeded' ? t.neg : t.warn} bold>{Math.round(status.ratio * 100)} %</Txt>
            </View>
            <ProgressBar ratio={status.ratio} color={status.level === 'exceeded' ? t.neg : t.warn} />
            <Txt sub size={13} style={{ marginTop: 6 }}>
              {formatAmount(status.spent)} sur {formatAmount(budget.amount)}
            </Txt>
          </Card>
        ))
      )}
    </Screen>
  );
}
