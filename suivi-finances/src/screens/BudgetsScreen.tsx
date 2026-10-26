import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { budgetStatus, formatAmount, monthKey, parseAmount } from '../domain';
import { useData } from '../state/DataContext';
import { Button, Card, Empty, Field, IconBubble, ProgressBar, Screen, SectionTitle, Txt, rowStyle } from '../ui/components';
import { monthLabel } from '../ui/format';
import { useTheme } from '../ui/theme';
import { useCategoryLook } from '../ui/useCategory';
import { CategoryChips } from './CategoryChips';

export function BudgetsScreen() {
  const { data, today, setBudget, removeBudget } = useData();
  const t = useTheme();
  const look = useCategoryLook();
  const month = monthKey(today);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');

  const expenseCats = data.categories.filter((c) => c.kind === 'expense' && !c.archived);

  const save = async () => {
    const cents = parseAmount(amount);
    if (!categoryId) return Alert.alert('Catégorie manquante', 'Choisis la catégorie à plafonner.');
    if (cents === null) return Alert.alert('Montant invalide', 'Exemple : 400 ou 400,50');
    await setBudget(categoryId, cents);
    setCategoryId(''); setAmount('');
  };

  const confirmRemove = (id: string) =>
    Alert.alert(`Supprimer le budget « ${look(id).name} » ?`, undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeBudget(id) },
    ]);

  return (
    <Screen>
      <Txt sub size={13}>Budgets de {monthLabel(month)} · du 1er au dernier jour du mois</Txt>
      {data.budgets.length === 0 && <Empty>Aucun budget pour l'instant.</Empty>}
      {data.budgets.map((budget) => {
        const s = budgetStatus(budget, month, data.transactions, data.categories, today);
        const l = look(budget.categoryId);
        const color = s.level === 'exceeded' ? t.neg : s.level === 'warning' ? t.warn : l.color;
        return (
          <Pressable key={budget.categoryId} onLongPress={() => confirmRemove(budget.categoryId)}>
            <Card>
              <View style={[rowStyle, { paddingVertical: 0, gap: 12 }]}>
                <IconBubble icon={l.icon} color={l.color} size={38} />
                <Txt bold style={{ flex: 1 }}>{l.name}</Txt>
                <Txt color={color} bold>{Math.round(s.ratio * 100)} %</Txt>
              </View>
              <ProgressBar ratio={s.ratio} color={color} />
              <Txt sub size={13} style={{ marginTop: 6 }}>
                {formatAmount(s.spent)} sur {formatAmount(budget.amount)} ·{' '}
                {s.remaining >= 0 ? `reste ${formatAmount(s.remaining)}` : `dépassé de ${formatAmount(-s.remaining)}`}
              </Txt>
            </Card>
          </Pressable>
        );
      })}
      {data.budgets.length > 0 && <Txt sub size={12} style={{ textAlign: 'center' }}>Appui long sur un budget pour le supprimer.</Txt>}

      <SectionTitle>Définir un budget</SectionTitle>
      <Card>
        <CategoryChips categories={expenseCats} kind="expense" selectedId={categoryId} onSelect={setCategoryId} allowNew={false} />
        <Field label="Plafond mensuel (€)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="400,00" />
        <Button title="Enregistrer" onPress={save} />
        <Txt sub size={12} style={{ marginTop: 8 }}>Si la catégorie a déjà un budget, il est remplacé. Pour une nouvelle catégorie, va dans Plus › Catégories.</Txt>
      </Card>
    </Screen>
  );
}
