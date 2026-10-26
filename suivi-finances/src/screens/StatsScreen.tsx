import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  balanceSeries, expensesByCategory, formatAmount, lastMonths, monthKey, monthSummary, monthlySeries,
} from '../domain';
import { useData } from '../state/DataContext';
import { ColumnsChart, DonutChart, LineChart } from '../ui/charts';
import { Button, Card, Empty, IconBubble, Money, ProgressBar, Screen, Segmented, SectionTitle, Txt, rowStyle } from '../ui/components';
import { monthLabel, shortMonth } from '../ui/format';
import { MonthNav } from '../ui/MonthNav';
import { useSeriesColors } from '../ui/palette';
import { useTheme } from '../ui/theme';
import { useCategoryLook } from '../ui/useCategory';

export function StatsScreen() {
  const { data, today } = useData();
  const t = useTheme();
  const colors = useSeriesColors();
  const look = useCategoryLook();
  const [month, setMonth] = useState(monthKey(today));
  const [picked, setPicked] = useState<string | null | undefined>(undefined); // catégorie sélectionnée dans l'anneau
  const [range, setRange] = useState<'6' | '12'>('6');
  const [colIdx, setColIdx] = useState<number | null>(null);
  const [lineIdx, setLineIdx] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  const summary = monthSummary(month, data.transactions, data.categories, today);
  const byCat = expensesByCategory(month, data.transactions, data.categories, today);
  const catTotal = byCat.reduce((s, x) => s + x.amount, 0);

  const months = lastMonths(month, Number(range));
  const series = monthlySeries(months, data.transactions, data.categories, today);
  const balances = balanceSeries(months, data.accounts, data.transactions, today);
  const cSel = colIdx !== null && colIdx < series.length ? colIdx : series.length - 1;
  const lSel = lineIdx !== null && lineIdx < balances.length ? lineIdx : balances.length - 1;
  const pickedRow = picked === undefined ? null : byCat.find((x) => x.categoryId === picked) ?? null;

  const changeMonth = (m: string) => { setMonth(m); setPicked(undefined); setColIdx(null); setLineIdx(null); };

  return (
    <Screen>
      <MonthNav month={month} onChange={changeMonth} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, padding: 12 }}>
          <Txt sub size={12}>Revenus</Txt>
          <Money cents={summary.income} bold />
        </Card>
        <Card style={{ flex: 1, padding: 12 }}>
          <Txt sub size={12}>Dépenses</Txt>
          <Money cents={summary.expenses} bold />
        </Card>
        <Card style={{ flex: 1, padding: 12 }}>
          <Txt sub size={12}>Épargne</Txt>
          <Txt bold color={summary.savingsRate !== null && summary.savingsRate < 0 ? t.neg : t.text}>
            {summary.savingsRate === null ? '–' : `${Math.round(summary.savingsRate * 100)} %`}
          </Txt>
        </Card>
      </View>

      <SectionTitle>Dépenses par catégorie</SectionTitle>
      <Card style={{ alignItems: 'stretch' }}>
        {byCat.length === 0 ? <Empty>Aucune dépense en {monthLabel(month)}.</Empty> : (
          <>
            <View style={{ alignItems: 'center', marginVertical: 8 }}>
              <DonutChart
                segments={byCat.map((x) => ({ id: x.categoryId, value: x.amount, color: look(x.categoryId).color }))}
                selected={picked} onSelect={(id) => setPicked(picked === id ? undefined : id)}>
                <Txt sub size={12}>{pickedRow ? look(pickedRow.categoryId).name : 'Total'}</Txt>
                <Txt bold size={20}>{formatAmount(pickedRow ? pickedRow.amount : catTotal)}</Txt>
                {pickedRow && <Txt sub size={12}>{Math.round((pickedRow.amount / catTotal) * 100)} %</Txt>}
              </DonutChart>
            </View>
            {byCat.map((x, i) => {
              const l = look(x.categoryId);
              const on = picked === x.categoryId;
              return (
                <Pressable key={String(x.categoryId)} onPress={() => setPicked(on ? undefined : x.categoryId)}
                  style={[{ paddingVertical: 10 }, i > 0 && { borderTopWidth: 0.5, borderTopColor: t.border }]}>
                  <View style={[rowStyle, { paddingVertical: 0, gap: 10 }]}>
                    <IconBubble icon={l.icon} color={l.color} size={30} />
                    <Txt style={{ flex: 1 }} bold={on}>{l.name}</Txt>
                    <Txt sub size={13}>{Math.round((x.amount / catTotal) * 100)} %</Txt>
                    <Txt bold={on} style={{ minWidth: 84, textAlign: 'right' }}>{formatAmount(x.amount)}</Txt>
                  </View>
                  <ProgressBar ratio={x.amount / byCat[0]!.amount} color={l.color} />
                </Pressable>
              );
            })}
            <Txt sub size={12} style={{ marginTop: 4 }}>Hors versements d'épargne. Touche une ligne ou un segment pour le mettre en avant.</Txt>
          </>
        )}
      </Card>

      <SectionTitle>Revenus et dépenses</SectionTitle>
      <Card>
        <Segmented options={[['6', '6 mois'], ['12', '12 mois']]} value={range} onChange={(r) => { setRange(r); setColIdx(null); setLineIdx(null); }} />
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
          <Legend color={colors.blue} label="Revenus" />
          <Legend color={colors.orange} label="Dépenses" />
        </View>
        <ColumnsChart
          data={series.map((p) => ({ label: shortMonth(p.month), a: p.income, b: p.expenses }))}
          colorA={colors.blue} colorB={colors.orange} selected={cSel} onSelect={setColIdx} />
        {series[cSel] && (
          <View style={{ marginTop: 8 }}>
            <Txt bold>{monthLabel(series[cSel]!.month)}</Txt>
            <Txt sub size={13}>
              Revenus {formatAmount(series[cSel]!.income)} · Dépenses {formatAmount(series[cSel]!.expenses)} · Solde du mois {formatAmount(series[cSel]!.income - series[cSel]!.expenses)}
            </Txt>
          </View>
        )}
        <Button title={table ? 'Masquer le tableau' : 'Afficher le tableau'} variant="ghost" onPress={() => setTable(!table)} />
        {table && [...series].reverse().map((p, i) => (
          <View key={p.month} style={[rowStyle, i > 0 && { borderTopWidth: 0.5, borderTopColor: t.border }]}>
            <Txt style={{ width: 90 }}>{monthLabel(p.month)}</Txt>
            <Txt sub size={13}>+{formatAmount(p.income)}  −{formatAmount(p.expenses)}</Txt>
          </View>
        ))}
      </Card>

      <SectionTitle>Évolution du solde</SectionTitle>
      <Card>
        <LineChart data={balances.map((p) => ({ label: shortMonth(p.month), value: p.balance }))}
          color={colors.blue} selected={lSel} onSelect={setLineIdx} />
        {balances[lSel] && (
          <View style={{ marginTop: 8 }}>
            <Txt bold>{monthLabel(balances[lSel]!.month)}</Txt>
            <Txt sub size={13}>Solde total {formatAmount(balances[lSel]!.balance)}{balances[lSel]!.month === monthKey(today) ? " (aujourd'hui)" : ' (fin de mois)'}</Txt>
          </View>
        )}
      </Card>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Txt size={13}>{label}</Txt>
    </View>
  );
}
