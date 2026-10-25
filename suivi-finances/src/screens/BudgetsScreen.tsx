import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { budgetStatus, formatAmount, monthKey, parseAmount } from '../domain';
import { useData } from '../state/DataContext';
import { Button, Card, Chip, ChipRow, Empty, Field, ProgressBar, Screen, SectionTitle, Txt, rowStyle } from '../ui/components';
import { monthLabel } from '../ui/format';
import { useTheme } from '../ui/theme';

export function BudgetsScreen() {
  const { data, today, setBudget, removeBudget } = useData();
  const t = useTheme();
  const month = monthKey(today);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');

  const expenseCats = data.categories.filter((c) => c.kind === 'expense' && !c.archived);
  const nameOf = (id: string) => data.categories.find((c) => c.id === id)?.name ?? '?';

  const save = async () => {
    const cents = parseAmount(amount);
    if (!categoryId) return Alert.alert('Catégorie manquante', 'Choisis la catégorie à plafonner.');
    if (cents === null) return Alert.alert('Montant invalide', 'Exemple : 400 ou 400,50');
    await setBudget(categoryId, cents);
    setCategoryId(null); setAmount('');
  };

  const confirmRemove = (id: string) =>
    Alert.alert(`Supprimer le budget « ${nameOf(id)} » ?`, undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeBudget(id) },
    ]);

  return (
    <Screen>
      <Txt sub size={13}>Budgets de {monthLabel(month)} · du 1er au dernier jour du mois</Txt>
      {data.budgets.length === 0 && <Empty>Aucun budget pour l'instant.</Empty>}
      {data.budgets.map((budget) => {
        const s = budgetStatus(budget, month, data.transactions, data.categories, today);
        const color = s.level === 'exceeded' ? t.neg : s.level === 'warning' ? t.warn : t.primary;
        return (
          <Pressable key={budget.categoryId} onLongPress={() => confirmRemove(budget.categoryId)}>
            <Card>
              <View style={rowStyle}>
                <Txt bold>{nameOf(budget.categoryId)}</Txt>
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
        <ChipRow>
          {expenseCats.map((c) => <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />)}
        </ChipRow>
        <Field label="Plafond mensuel (€)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="400,00" />
        <Button title="Enregistrer" onPress={save} />
        <Txt sub size={12} style={{ marginTop: 8 }}>Si la catégorie a déjà un budget, il est remplacé.</Txt>
      </Card>
    </Screen>
  );
}
