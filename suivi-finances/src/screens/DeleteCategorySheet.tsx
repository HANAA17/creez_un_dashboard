import React, { useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { envelopeBalance, formatAmount, type Category } from '../domain';
import { useData } from '../state/DataContext';
import { Button, Card, Screen, SectionTitle, Txt, rowStyle } from '../ui/components';
import { useTheme } from '../ui/theme';
import { CategoryChips } from './CategoryChips';

/**
 * Suppression d'une catégorie. S'il y a des transactions, des planifications ou de l'argent dans son enveloppe,
 * on choisit : tout déplacer vers une autre catégorie du même type, ou tout supprimer.
 */
export function DeleteCategorySheet({ category, onClose, onDeleted }: { category: Category | null; onClose: () => void; onDeleted: () => void }) {
  return (
    <Modal visible={category !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {category !== null && <Body category={category} onClose={onClose} onDeleted={onDeleted} />}
    </Modal>
  );
}

function Body({ category, onClose, onDeleted }: { category: Category; onClose: () => void; onDeleted: () => void }) {
  const { data, env, today, deleteCategory } = useData();
  const t = useTheme();
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);

  const txCount = data.transactions.filter((x) => x.type !== 'transfer' && x.categoryId === category.id).length;
  const ruleCount = data.recurrences.filter((r) => r.template.type !== 'transfer' && r.template.categoryId === category.id).length;
  const balance = category.kind === 'income' ? 0 : envelopeBalance(category.id, env, today);
  const allocCount = data.allocations.filter((a) => a.categoryId === category.id).length;
  const goal = data.goals.find((g) => g.categoryId === category.id);
  const linked = txCount + ruleCount + allocCount > 0;
  const candidates = data.categories.filter((c) => c.id !== category.id && !c.archived && c.kind === category.kind);

  const lines = [
    txCount > 0 ? `${txCount} transaction${txCount > 1 ? 's' : ''}` : null,
    ruleCount > 0 ? `${ruleCount} planification${ruleCount > 1 ? 's' : ''}` : null,
    balance !== 0 ? `${formatAmount(balance)} dans son enveloppe` : null,
    goal ? "l'objectif d'épargne associé" : null,
  ].filter(Boolean) as string[];

  const run = async (mode: Parameters<typeof deleteCategory>[1]) => {
    setBusy(true);
    try {
      await deleteCategory(category.id, mode);
      onDeleted();
    } catch (e) {
      Alert.alert('Suppression impossible', e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const confirmPurge = () =>
    Alert.alert(
      `Tout supprimer ?`,
      `« ${category.name} » et ${lines.length ? lines.join(', ') : 'tout ce qui s\'y rattache'} seront supprimés définitivement.${balance > 0 ? " L'argent de l'enveloppe retourne dans « À répartir »." : ''}`,
      [{ text: 'Annuler', style: 'cancel' }, { text: 'Tout supprimer', style: 'destructive', onPress: () => run({ type: 'purge' }) }],
    );

  const targetName = candidates.find((c) => c.id === target)?.name;

  return (
    <Screen>
      <View style={rowStyle}>
        <Txt bold size={20}>Supprimer « {category.name} »</Txt>
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </View>

      {!linked && !goal && (
        <>
          <Txt sub>Cette catégorie n'est utilisée nulle part : elle peut être supprimée sans conséquence.</Txt>
          <Button title="Supprimer" variant="danger" onPress={() => run({ type: 'purge' })} disabled={busy} />
        </>
      )}

      {(linked || goal) && (
        <>
          <Card>
            <Txt>Cette catégorie contient :</Txt>
            {lines.map((l) => <Txt key={l} bold>• {l}</Txt>)}
          </Card>

          {candidates.length > 0 ? (
            <>
              <SectionTitle>Les déplacer vers</SectionTitle>
              <CategoryChips categories={candidates} kind={category.kind === 'income' ? 'income' : 'expense'} selectedId={target} onSelect={setTarget} allowNew={false} />
              <Button title={targetName ? `Déplacer vers « ${targetName} » et supprimer` : 'Choisis une catégorie'}
                onPress={() => run({ type: 'move', to: target })} disabled={busy || !target} />
              {goal && <Txt sub size={12}>L'objectif « {goal.name} » sera supprimé ; son argent rejoindra l'enveloppe choisie.</Txt>}
            </>
          ) : (
            <Txt sub size={13}>Il n'y a pas d'autre catégorie de ce type vers laquelle déplacer. Crée-en une, ou supprime tout.</Txt>
          )}

          <SectionTitle>Ou</SectionTitle>
          <Button title="Tout supprimer" variant="danger" onPress={confirmPurge} disabled={busy} />
          <Txt sub size={12} color={t.sub}>Supprime la catégorie et tout ce qui y est rattaché. Irréversible : pense à exporter une sauvegarde avant.</Txt>
        </>
      )}
    </Screen>
  );
}
