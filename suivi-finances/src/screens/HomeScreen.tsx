import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  accountBalance, addDays, envelopeBalances, formatAmount, goalProgress, monthKey, monthSummary, nextOccurrence, poolSummary, totalBalance,
  type RecurrenceRule,
} from '../domain';
import { useData } from '../state/DataContext';
import { ACCOUNT_LOOK } from '../ui/accountLook';
import { Button, Card, Empty, IconBubble, Money, ProgressBar, Screen, SectionTitle, Txt, rowStyle } from '../ui/components';
import { monthLabel, shortDate } from '../ui/format';
import { useSeriesColors } from '../ui/palette';
import { useTheme } from '../ui/theme';
import { TransactionRow } from '../ui/TransactionRow';
import { useCategoryLook } from '../ui/useCategory';

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 }}>
      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{label}</Text>
      <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <SectionTitle>{title}</SectionTitle>
      {action && <Button title={action} variant="ghost" onPress={onAction ?? (() => {})} />}
    </View>
  );
}

export function HomeScreen() {
  const { data, env, today } = useData();
  const nav = useNavigation<any>();
  const t = useTheme();
  const colors = useSeriesColors();
  const look = useCategoryLook();
  const month = monthKey(today);

  const total = totalBalance(data.accounts, data.transactions, today);
  const s = monthSummary(month, data.transactions, data.categories, today, data.allocations);
  const accounts = data.accounts.filter((a) => !a.archived);
  const pool = poolSummary(data.accounts, env, today);
  const overspent = [...envelopeBalances(env, today).entries()].filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
  const horizon = addDays(today, 30);
  const upcoming = data.recurrences
    .filter((r) => !r.paused)
    .map((r) => ({ r, date: nextOccurrence(r) }))
    .filter((x): x is { r: RecurrenceRule; date: string } => x.date !== null && x.date <= horizon)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const recent = data.transactions.filter((tx) => tx.date <= today).slice(0, 5);
  const account = (id: string) => data.accounts.find((a) => a.id === id)?.name ?? '?';

  return (
    <Screen>
      <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20 }}>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Solde total</Text>
        <Text style={{ color: '#ffffff', fontSize: 38, fontWeight: '700', marginVertical: 4 }}>{formatAmount(total)}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 14 }}>{monthLabel(month)}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pill label="Revenus" value={`+${formatAmount(s.income)}`} />
          <Pill label="Dépenses" value={`−${formatAmount(s.expenses)}`} />
        </View>
      </LinearGradient>

      {accounts.length === 0 && <Empty>Commence par créer un compte dans Plus › Comptes.</Empty>}
      {accounts.length > 0 && (
        <>
          <SectionHeader title="Comptes" action="Gérer" onAction={() => nav.navigate('Plus', { page: 'accounts' })} />
          <Card style={{ paddingVertical: 4 }}>
            {accounts.map((a, i) => {
              const l = ACCOUNT_LOOK[a.type];
              return (
                <View key={a.id} style={[rowStyle, { gap: 12 }, i > 0 && { borderTopWidth: 0.5, borderTopColor: t.border }]}>
                  <IconBubble icon={l.icon} color={colors[l.color]} size={38} />
                  <View style={{ flex: 1 }}>
                    <Txt>{a.name}</Txt>
                    <Txt sub size={13}>{l.label}</Txt>
                  </View>
                  <Money cents={accountBalance(a, data.transactions, today)} bold />
                </View>
              );
            })}
          </Card>
        </>
      )}

      {pool.toAllocate !== 0 && (
        <Pressable onPress={() => nav.navigate('Enveloppes')}>
          <Card style={{ borderColor: pool.toAllocate < 0 ? t.neg : t.primary, borderWidth: 1.5 }}>
            <View style={[rowStyle, { paddingVertical: 0, gap: 12 }]}>
              <IconBubble icon={pool.toAllocate > 0 ? 'cash' : 'alert'} color={pool.toAllocate > 0 ? t.primary : t.neg} size={40} />
              <View style={{ flex: 1 }}>
                <Txt bold>{pool.toAllocate > 0 ? `${formatAmount(pool.toAllocate)} à répartir` : `Réparti en trop : ${formatAmount(-pool.toAllocate)}`}</Txt>
                <Txt sub size={13}>{pool.toAllocate > 0 ? 'Mets cet argent dans tes enveloppes.' : 'Retire de l\'argent d\'une enveloppe.'}</Txt>
              </View>
              <Txt color={t.primary} bold>Ouvrir ›</Txt>
            </View>
          </Card>
        </Pressable>
      )}

      {overspent.length > 0 && (
        <>
          <SectionTitle>Enveloppes dépassées</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>
            {overspent.slice(0, 4).map(([id, value], i) => {
              const l = look(id);
              return (
                <View key={id} style={[rowStyle, { gap: 12 }, i > 0 && { borderTopWidth: 0.5, borderTopColor: t.border }]}>
                  <IconBubble icon={l.icon} color={l.color} size={34} />
                  <Txt style={{ flex: 1 }}>{l.name}</Txt>
                  <Txt bold color={t.neg}>{formatAmount(value)}</Txt>
                </View>
              );
            })}
          </Card>
        </>
      )}

      {data.goals.length > 0 && (
        <>
          <SectionHeader title="Objectifs d'épargne" action="Voir" onAction={() => nav.navigate('Plus', { page: 'savings' })} />
          <Card>
            {data.goals.slice(0, 3).map((g, i) => {
              const p = goalProgress(g, env, today);
              const l = look(g.categoryId);
              return (
                <View key={g.id} style={i > 0 ? { marginTop: 14 } : undefined}>
                  <View style={[rowStyle, { paddingVertical: 0, gap: 12 }]}>
                    <IconBubble icon={l.icon} color={l.color} size={34} />
                    <Txt bold style={{ flex: 1 }}>{g.name}</Txt>
                    <Txt bold>{Math.round(p.ratio * 100)} %</Txt>
                  </View>
                  <ProgressBar ratio={p.ratio} color={l.color} />
                  <Txt sub size={13} style={{ marginTop: 6 }}>{formatAmount(p.saved)} sur {formatAmount(g.target)}</Txt>
                </View>
              );
            })}
          </Card>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <SectionHeader title="À venir · 30 jours" action="Planifications" onAction={() => nav.navigate('Plus', { page: 'recurrences' })} />
          <Card style={{ paddingVertical: 4 }}>
            {upcoming.map(({ r, date }, i) => {
              const tpl = r.template;
              const l = tpl.type === 'transfer' ? null : look(tpl.categoryId);
              return (
                <View key={r.id} style={[rowStyle, { gap: 12 }, i > 0 && { borderTopWidth: 0.5, borderTopColor: t.border }]}>
                  <IconBubble icon={l?.icon ?? 'swap-horizontal'} color={l?.color ?? colors.violet} size={38} />
                  <View style={{ flex: 1 }}>
                    <Txt>{tpl.type === 'transfer' ? `Virement ${account(tpl.fromAccountId)} → ${account(tpl.toAccountId)}` : l!.name}</Txt>
                    <Txt sub size={13}>{shortDate(date)}</Txt>
                  </View>
                  {tpl.type === 'transfer' ? <Money cents={tpl.amount} /> : <Money cents={tpl.type === 'income' ? tpl.amount : -tpl.amount} signed />}
                </View>
              );
            })}
          </Card>
        </>
      )}

      <SectionHeader title="Dernières transactions" action="Tout voir" onAction={() => nav.navigate('Transactions')} />
      {recent.length === 0 ? <Empty>Aucune transaction pour l'instant. Touche + pour en ajouter.</Empty> : (
        <Card style={{ paddingVertical: 4 }}>
          {recent.map((tx, i) => <TransactionRow key={tx.id} tx={tx} divider={i > 0} />)}
        </Card>
      )}
    </Screen>
  );
}
