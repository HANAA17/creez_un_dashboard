import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';
import { addMonthsClamped, currencySymbol, formatAmount, goalProgress, parseAmount, type Goal } from '../domain';
import { useData } from '../state/DataContext';
import { useUi } from '../ui/Ui';
import { Button, Card, ColorPicker, Empty, Field, IconBubble, IconPicker, ProgressBar, Screen, SectionTitle, Txt, rowStyle } from '../ui/components';
import { dateToIso, isoToDate, shortDate } from '../ui/format';
import type { IconName } from '../ui/icons';
import { useSeriesColors, type ColorKey } from '../ui/palette';
import { useTheme } from '../ui/theme';
import { useCategoryLook } from '../ui/useCategory';
import { GoalEditor } from './GoalEditor';
import { TransferSheet, type TransferPreset } from './TransferSheet';

export function SavingsScreen() {
  const { data, env, today, addGoal } = useData();
  const { openAdd } = useUi();
  const t = useTheme();
  const colors = useSeriesColors();
  const look = useCategoryLook();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [hasDate, setHasDate] = useState(false);
  const [date, setDate] = useState(isoToDate(addMonthsClamped(today, 12)));
  const [color, setColor] = useState<ColorKey>('green');
  const [icon, setIcon] = useState<IconName>('trophy');
  const [transfer, setTransfer] = useState<TransferPreset | null>(null);
  const [editing, setEditing] = useState<Goal | null>(null);

  const create = async () => {
    const cents = parseAmount(target);
    if (!name.trim()) return Alert.alert('Nom manquant', "Par exemple : Voyage, Apport, Fonds d'urgence.");
    if (cents === null) return Alert.alert('Montant invalide', 'Indique le montant à atteindre, par exemple 3000.');
    try {
      await addGoal({ name, target: cents, targetDate: hasDate ? dateToIso(date) : undefined, icon, color });
      setName(''); setTarget(''); setHasDate(false);
    } catch (e) {
      Alert.alert('Impossible de créer', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen>
      <Txt sub size={13}>Chaque objectif est une enveloppe : l'argent y est réservé, il reste dans tes comptes. « Verser » le prend dans « À répartir », « Retirer » l'y remet.</Txt>
      {data.goals.length === 0 && <Empty>Crée un objectif d'épargne : chacun a sa propre enveloppe.</Empty>}
      {data.goals.map((goal) => {
        const p = goalProgress(goal, env, today);
        const l = look(goal.categoryId);
        return (
          <Card key={goal.id}>
            <Pressable onPress={() => setEditing(goal)} accessibilityRole="button" accessibilityLabel={`Modifier ${goal.name}`}>
              <View style={[rowStyle, { paddingVertical: 0, gap: 12 }]}>
                <IconBubble icon={l.icon} color={l.color} size={42} />
                <Txt bold style={{ flex: 1 }}>{goal.name}</Txt>
                <Txt bold color={p.reached ? t.pos : t.text}>{Math.round(p.ratio * 100)} %</Txt>
              </View>
              <ProgressBar ratio={p.ratio} color={p.reached ? t.pos : l.color} />
              <Txt sub size={13} style={{ marginTop: 6 }}>
                {formatAmount(p.saved)} sur {formatAmount(goal.target)}
                {p.reached ? ' · objectif atteint 🎉' : ` · reste ${formatAmount(p.remaining)}`}
              </Txt>
              {goal.targetDate && !p.reached && (
                <Txt sub size={13}>
                  {p.overdue
                    ? `Date cible dépassée (${shortDate(goal.targetDate)})`
                    : `Pour le ${shortDate(goal.targetDate)} : ${formatAmount(p.monthlyNeeded ?? 0)} par mois`}
                </Txt>
              )}
            </Pressable>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 }}>
              <Button title="Verser" variant="ghost" onPress={() => setTransfer({ from: null, to: goal.categoryId })} />
              <Button title="Retirer" variant="ghost" onPress={() => setTransfer({ from: goal.categoryId, to: null })} />
              <Button title="Dépenser" variant="ghost" onPress={() => openAdd({ type: 'expense', categoryId: goal.categoryId })} />
            </View>
          </Card>
        );
      })}
      {data.goals.length > 0 && <Txt sub size={12} style={{ textAlign: 'center' }}>Touche un objectif pour le modifier ou le supprimer.</Txt>}

      <SectionTitle>Nouvel objectif</SectionTitle>
      <Card>
        <Field label="Nom" value={name} onChangeText={setName} placeholder="Voyage, Apport..." />
        <Field label={`Montant à atteindre (${currencySymbol()})`} value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="3000,00" />
        <View style={[rowStyle, { marginBottom: 8 }]}>
          <Txt>Date cible</Txt>
          <Switch value={hasDate} onValueChange={setHasDate} />
        </View>
        {hasDate && (
          <DateTimePicker value={date} mode="date" display="compact" minimumDate={new Date()} locale="fr-FR"
            onChange={(_, d) => d && setDate(d)} style={{ alignSelf: 'flex-start', marginBottom: 12 }} />
        )}
        <Txt sub size={13} style={{ marginBottom: 8 }}>Couleur</Txt>
        <ColorPicker value={color} onChange={setColor} />
        <Txt sub size={13} style={{ marginBottom: 8 }}>Icône</Txt>
        <IconPicker value={icon} color={colors[color]} onChange={setIcon} />
        <Button title="Créer l'objectif" onPress={create} />
      </Card>

      <TransferSheet preset={transfer} onClose={() => setTransfer(null)} />
      <GoalEditor goal={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}
