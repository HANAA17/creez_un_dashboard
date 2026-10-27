import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import {
  envelopeBalances, envelopes, formatAmount, formatAmountShort, goalProgress, poolSummary, spentThisMonth,
} from '../domain';
import { useData } from '../state/DataContext';
import { Button, Card, Empty, IconBubble, Money, ProgressBar, Screen, SectionTitle, Txt } from '../ui/components';
import { shortDate } from '../ui/format';
import { useTheme } from '../ui/theme';
import { useCategoryLook } from '../ui/useCategory';
import { AllocateForm } from './AllocateSheet';
import { TransactionForm } from './AddTransactionSheet';
import { CategoryForm } from './CategoryEditor';
import { EnvelopeDetailBody } from './EnvelopeDetail';
import { PlanForm } from './PlanSheet';
import { TransferForm, type TransferPreset } from './TransferSheet';

/**
 * Une seule fenêtre à la fois. Sur iPhone, ouvrir une deuxième fenêtre « à côté » de la première échoue en silence
 * et peut bloquer toutes les suivantes. On change donc le CONTENU de la fenêtre (détail → modifier → retour au détail).
 */
type View_ =
  | { t: 'allocate'; fromPlan: boolean }
  | { t: 'plan' }
  | { t: 'transfer'; preset: TransferPreset; back?: string }
  | { t: 'detail'; id: string }
  | { t: 'category'; id: string; back: string }
  | { t: 'tx'; id: string; back: string };

function EnvelopeRow({ id, first, onOpen, onCover }: { id: string; first: boolean; onOpen: () => void; onCover: () => void }) {
  const { data, env, today } = useData();
  const t = useTheme();
  const look = useCategoryLook();
  const l = look(id);
  const balance = envelopeBalances(env, today).get(id) ?? 0;
  const goal = data.goals.find((g) => g.categoryId === id);
  const plan = data.budgets.find((b) => b.categoryId === id)?.amount ?? 0;
  const spent = spentThisMonth(id, env, today);
  const sub = goal
    ? `Objectif ${formatAmountShort(goal.target)}${goal.targetDate ? ` · avant le ${shortDate(goal.targetDate)}` : ''}`
    : [plan ? `Plan ${formatAmountShort(plan)}/mois` : null, spent ? `dépensé ce mois ${formatAmount(spent)}` : null].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={onOpen} style={[{ paddingVertical: 10 }, !first && { borderTopWidth: 0.5, borderTopColor: t.border }]}>
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
          <Button title="Couvrir" variant="danger" onPress={onCover} />
        </View>
      )}
    </Pressable>
  );
}

export function EnvelopesScreen() {
  const { data, env, today } = useData();
  const t = useTheme();
  const [view, setView] = useState<View_ | null>(null);

  const pool = poolSummary(data.accounts, env, today);
  const list = envelopes(data.categories);
  const expense = list.filter((c) => c.kind === 'expense');
  const savings = list.filter((c) => c.kind === 'savings');

  // Si l'enveloppe affichée disparaît (catégorie supprimée), on referme la fenêtre.
  const shownId = view && (view.t === 'detail' || view.t === 'category') ? view.id : null;
  const missing = shownId !== null && !data.categories.some((c) => c.id === shownId);
  useEffect(() => { if (missing) setView(null); }, [missing]);

  const close = () => setView(null);
  const backTo = (id?: string) => () => setView(id ? { t: 'detail', id } : null);

  const body = () => {
    if (!view || missing) return null;
    switch (view.t) {
      case 'allocate': return <AllocateForm fromPlan={view.fromPlan} onClose={close} />;
      case 'plan': return <PlanForm onClose={close} />;
      case 'transfer': return <TransferForm preset={view.preset} onClose={backTo(view.back)} />;
      case 'detail':
        return (
          <EnvelopeDetailBody id={view.id} onClose={close}
            onTransfer={(preset) => setView({ t: 'transfer', preset, back: view.id })}
            onEditCategory={() => setView({ t: 'category', id: view.id, back: view.id })}
            onEditTransaction={(txId) => setView({ t: 'tx', id: txId, back: view.id })} />
        );
      case 'category': {
        const cat = data.categories.find((c) => c.id === view.id);
        return cat ? <CategoryForm kind={cat.kind} category={cat} onClose={backTo(view.back)} /> : null;
      }
      case 'tx': return <TransactionForm preset={{ editId: view.id }} onClose={backTo(view.back)} />;
    }
  };

  return (
    <Screen>
      <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20 }}>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>À répartir</Text>
        <Text style={{ color: '#ffffff', fontSize: 34, fontWeight: '700', marginVertical: 4 }}>{formatAmount(pool.toAllocate)}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>
          {pool.toAllocate > 0 ? "Cet argent n'est dans aucune enveloppe." : pool.toAllocate === 0 ? 'Tout est réparti ✓' : `Tu as réparti ${formatAmount(-pool.toAllocate)} de trop.`}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 10 }}>
          Dans les enveloppes : {formatAmount(pool.inEnvelopes)} · Total des comptes : {formatAmount(pool.total)}
        </Text>
      </LinearGradient>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button title="Répartir" onPress={() => setView({ t: 'allocate', fromPlan: data.budgets.length > 0 })} /></View>
        <View style={{ flex: 1 }}><Button title="Transférer" variant="ghost" onPress={() => setView({ t: 'transfer', preset: {} })} /></View>
        <View style={{ flex: 1 }}><Button title="Plan" variant="ghost" onPress={() => setView({ t: 'plan' })} /></View>
      </View>

      {list.length === 0 && <Empty>Aucune enveloppe. Crée des catégories de dépense ou un objectif d'épargne.</Empty>}

      {expense.length > 0 && (
        <>
          <SectionTitle>Dépenses</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>
            {expense.map((c, i) => (
              <EnvelopeRow key={c.id} id={c.id} first={i === 0} onOpen={() => setView({ t: 'detail', id: c.id })}
                onCover={() => setView({ t: 'transfer', preset: { from: undefined, to: c.id, amount: -(envelopeBalances(env, today).get(c.id) ?? 0) } })} />
            ))}
          </Card>
        </>
      )}
      {savings.length > 0 && (
        <>
          <SectionTitle>Épargne</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>
            {savings.map((c, i) => (
              <EnvelopeRow key={c.id} id={c.id} first={i === 0} onOpen={() => setView({ t: 'detail', id: c.id })}
                onCover={() => setView({ t: 'transfer', preset: { from: undefined, to: c.id, amount: -(envelopeBalances(env, today).get(c.id) ?? 0) } })} />
            ))}
          </Card>
        </>
      )}

      <Txt sub size={12} style={{ textAlign: 'center' }}>
        L'argent non dépensé reste dans l'enveloppe d'un mois à l'autre. Les dépenses comptent à partir du {shortDate(data.envelopesStart)}.
      </Txt>

      <Modal visible={view !== null && !missing} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        {view !== null && !missing && <React.Fragment key={JSON.stringify(view)}>{body()}</React.Fragment>}
      </Modal>
    </Screen>
  );
}
