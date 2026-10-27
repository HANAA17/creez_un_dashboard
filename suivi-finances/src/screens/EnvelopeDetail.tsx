import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { envelopeBalance, envelopeHistory, formatAmount, formatAmountShort, spentThisMonth, type Allocation, type EnvelopeLine } from '../domain';
import { useData } from '../state/DataContext';
import { Button, Card, Empty, IconBubble, Money, Screen, SectionTitle, Txt, rowStyle } from '../ui/components';
import { shortDate } from '../ui/format';
import { useTheme } from '../ui/theme';
import { useCategoryLook } from '../ui/useCategory';
import type { TransferPreset } from './TransferSheet';

/** Détail d'une enveloppe : solde, plan, actions rapides et historique. À afficher dans une fenêtre déjà ouverte. */
export function EnvelopeDetailBody({ id, onClose, onTransfer, onEditCategory, onEditTransaction }: {
  id: string; onClose: () => void; onTransfer: (p: TransferPreset) => void; onEditCategory: () => void; onEditTransaction: (id: string) => void;
}) {
  const { data, env, today, deleteAllocation } = useData();
  const t = useTheme();
  const look = useCategoryLook();
  const l = look(id);
  const balance = envelopeBalance(id, env, today);
  const plan = data.budgets.find((b) => b.categoryId === id)?.amount ?? 0;
  const history = envelopeHistory(id, env, today);
  const goal = data.goals.find((g) => g.categoryId === id);

  const describe = (line: EnvelopeLine): string => {
    if (line.kind === 'expense') {
      const tx = line.transaction!;
      return tx.type === 'transfer' ? 'Virement' : (tx.note ?? 'Dépense');
    }
    const a = line.allocation as Allocation;
    if (a.groupId) {
      const other = data.allocations.find((x) => x.groupId === a.groupId && x.id !== a.id);
      return a.amount > 0
        ? `Transfert depuis ${other ? look(other.categoryId).name : 'À répartir'}`
        : `Transfert vers ${other ? look(other.categoryId).name : 'À répartir'}`;
    }
    return a.note ?? (a.amount > 0 ? 'Répartition' : 'Retrait vers À répartir');
  };

  const tap = (line: EnvelopeLine) => {
    if (line.kind === 'expense') return onEditTransaction(line.transaction!.id);
    const a = line.allocation!;
    Alert.alert('Supprimer ce mouvement ?', a.groupId ? 'Les deux côtés du transfert seront supprimés.' : "L'argent retournera dans « À répartir ».", [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteAllocation(a) },
    ]);
  };

  return (
    <Screen>
      <View style={rowStyle}>
        <Txt bold size={20}>{l.name}</Txt>
        <Button title="Fermer" variant="ghost" onPress={onClose} />
      </View>

      <Card style={{ alignItems: 'center', gap: 6 }}>
        <IconBubble icon={l.icon} color={l.color} size={56} />
        <Txt sub size={13}>Solde de l'enveloppe</Txt>
        <Txt bold size={30} color={balance < 0 ? t.neg : t.text}>{formatAmount(balance)}</Txt>
        {balance < 0 && <Txt size={13} color={t.neg}>Enveloppe dépassée : couvre-la depuis une autre enveloppe.</Txt>}
        <Txt sub size={13}>
          Dépensé ce mois-ci : {formatAmount(spentThisMonth(id, env, today))}{plan ? ` · plan ${formatAmountShort(plan)}/mois` : ''}
        </Txt>
        {goal && <Txt sub size={13}>Objectif : {formatAmountShort(goal.target)}</Txt>}
      </Card>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button title="Mettre de l'argent" onPress={() => onTransfer({ from: null, to: id, amount: balance < 0 ? -balance : undefined })} /></View>
        <View style={{ flex: 1 }}><Button title="Déplacer" variant="ghost" onPress={() => onTransfer({ from: id, to: undefined })} /></View>
      </View>
      <Button title="Modifier ou supprimer la catégorie" variant="ghost" onPress={onEditCategory} />

      <SectionTitle>Mouvements</SectionTitle>
      {history.length === 0 ? <Empty>Aucun mouvement pour l'instant.</Empty> : (
        <Card style={{ paddingVertical: 4 }}>
          {history.map((line, i) => (
            <Pressable key={line.kind + (line.allocation?.id ?? line.transaction?.id)} onPress={() => tap(line)}
              style={[rowStyle, { gap: 12 }, i > 0 && { borderTopWidth: 0.5, borderTopColor: t.border }]}>
              <View style={{ flex: 1 }}>
                <Txt>{describe(line)}</Txt>
                <Txt sub size={13}>{shortDate(line.date)}</Txt>
              </View>
              <Money cents={line.amount} signed />
            </Pressable>
          ))}
        </Card>
      )}
      <Txt sub size={12} style={{ textAlign: 'center' }}>Touche une répartition pour la supprimer, une dépense pour la modifier.</Txt>
    </Screen>
  );
}
