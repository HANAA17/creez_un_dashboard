import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { envelopeBalances, envelopes, formatAmount, formatAmountShort, goalProgress, poolSummary, spentThisMonth } from '../domain';
import { useData } from '../state/DataContext';
import { Button, Card, Empty, IconBubble, Money, ProgressBar, Screen, SectionTitle, Txt } from '../ui/components';
import { shortDate } from '../ui/format';
import { useUi } from '../ui/Ui';
import { useTheme } from '../ui/theme';
import { useCategoryLook } from '../ui/useCategory';
import { AllocateSheet } from './AllocateSheet';
import { CategoryEditor } from './CategoryEditor';
import { EnvelopeDetail } from './EnvelopeDetail';
import { PlanSheet } from './PlanSheet';
import { TransferSheet, type TransferPreset } from './TransferSheet';

type Sheet = { type: 'allocate'; fromPlan: boolean } | { type: 'plan' } | null;

export function EnvelopesScreen() {
  const { data, env, today } = useData();
  const { openAdd } = useUi();
  const t = useTheme();
  const look = useCategoryLook();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [transfer, setTransfer] = useState<TransferPreset | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [editCat, setEditCat] = useState<string | null>(null);

  const pool = poolSummary(data.accounts, env, today);
  const balances = envelopeBalances(env, today);
  const list = envelopes(data.categories);
  const expense = list.filter((c) => c.kind === 'expense');
  const savings = list.filter((c) => c.kind === 'savings');
  const planOf = (id: string) => data.budgets.find((b) => b.categoryId === id)?.amount ?? 0;
  const editing = data.categories.find((c) => c.id === editCat) ?? null;

  const Row = ({ id, first }: { id: string; first: boolean }) => {
    const l = look(id);
    const balance = balances.get(id) ?? 0;
    const goal = data.goals.find((g) => g.categoryId === id);
    const plan = planOf(id);
    const spent = spentThisMonth(id, env, today);
    const sub = goal
      ? `Objectif ${formatAmountShort(goal.target)}${goal.targetDate ? ` · avant le ${shortDate(goal.targetDate)}` : ''}`
      : [plan ? `Plan ${formatAmountShort(plan)}/mois` : null, spent ? `dépensé ce mois ${formatAmount(spent)}` : null].filter(Boolean).join(' · ');
    return (
      <Pressable onPress={() => setDetail(id)}
        style={[{ paddingVertical: 10 }, !first && { borderTopWidth: 0.5, borderTopColor: t.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBubble icon={l.icon} color={l.color} size={38} />
          <View style={{ flex: 1 }}>
            <Txt>{l.name}</Txt>
            {!!sub && <Txt sub size={12}>{sub}</Txt>}
          </View>
          <Money cents={balance} bold />
        </View>
        {goal && <ProgressBar ratio={goalProgress(goal, env, today).ratio} color={l.color} />}
        {balance < 0 && (
          <View style={{ alignItems: 'flex-end' }}>
            <Button title="Couvrir" variant="danger" onPress={() => setTransfer({ from: undefined, to: id, amount: -balance })} />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <Screen>
      <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20 }}>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>À répartir</Text>
        <Text style={{ color: '#ffffff', fontSize: 34, fontWeight: '700', marginVertical: 4 }}>{formatAmount(pool.toAllocate)}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>
          {pool.toAllocate > 0 ? 'Cet argent n\'est dans aucune enveloppe.' : pool.toAllocate === 0 ? 'Tout est réparti ✓' : `Tu as réparti ${formatAmount(-pool.toAllocate)} de trop.`}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 10 }}>
          Dans les enveloppes : {formatAmount(pool.inEnvelopes)} · Total des comptes : {formatAmount(pool.total)}
        </Text>
      </LinearGradient>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button title="Répartir" onPress={() => setSheet({ type: 'allocate', fromPlan: data.budgets.length > 0 })} /></View>
        <View style={{ flex: 1 }}><Button title="Transférer" variant="ghost" onPress={() => setTransfer({})} /></View>
        <View style={{ flex: 1 }}><Button title="Plan" variant="ghost" onPress={() => setSheet({ type: 'plan' })} /></View>
      </View>

      {list.length === 0 && <Empty>Aucune enveloppe. Crée des catégories de dépense ou un objectif d'épargne.</Empty>}

      {expense.length > 0 && (
        <>
          <SectionTitle>Dépenses</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>{expense.map((c, i) => <Row key={c.id} id={c.id} first={i === 0} />)}</Card>
        </>
      )}
      {savings.length > 0 && (
        <>
          <SectionTitle>Épargne</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>{savings.map((c, i) => <Row key={c.id} id={c.id} first={i === 0} />)}</Card>
        </>
      )}

      <Txt sub size={12} style={{ textAlign: 'center' }}>
        L'argent non dépensé reste dans l'enveloppe d'un mois à l'autre. Les dépenses comptent à partir du {shortDate(data.envelopesStart)}.
      </Txt>

      <AllocateSheet visible={sheet?.type === 'allocate'} fromPlan={sheet?.type === 'allocate' && sheet.fromPlan} onClose={() => setSheet(null)} />
      <PlanSheet visible={sheet?.type === 'plan'} onClose={() => setSheet(null)} />
      <TransferSheet preset={transfer} onClose={() => setTransfer(null)} />
      <EnvelopeDetail categoryId={detail} onClose={() => setDetail(null)} onTransfer={setTransfer}
        onEditCategory={(id) => setEditCat(id)} onEditTransaction={(id) => openAdd({ editId: id })} />
      <CategoryEditor visible={editing !== null} kind={editing?.kind ?? 'expense'} category={editing} onClose={() => { setEditCat(null); setDetail(null); }} />
    </Screen>
  );
}
