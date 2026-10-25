import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { formatAmount, goalProgress, parseAmount, addMonthsClamped } from '../domain';
import { useData } from '../state/DataContext';
import { useUi } from '../ui/Ui';
import { Button, Card, Empty, Field, ProgressBar, Screen, SectionTitle, Txt, rowStyle } from '../ui/components';
import { dateToIso, isoToDate, shortDate } from '../ui/format';
import { useTheme } from '../ui/theme';

export function SavingsScreen() {
  const { data, today, addGoal } = useData();
  const { openAdd } = useUi();
  const t = useTheme();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [hasDate, setHasDate] = useState(false);
  const [date, setDate] = useState(isoToDate(addMonthsClamped(today, 12)));

  const create = async () => {
    const cents = parseAmount(target);
    if (!name.trim()) return Alert.alert('Nom manquant', 'Par exemple : Voyage, Apport, Fonds d\'urgence.');
    if (cents === null) return Alert.alert('Montant invalide', "Indique le montant à atteindre, par exemple 3000.");
    await addGoal({ name, target: cents, targetDate: hasDate ? dateToIso(date) : undefined });
    setName(''); setTarget(''); setHasDate(false);
  };

  return (
    <Screen>
      {data.goals.length === 0 && <Empty>Crée un objectif d'épargne : chacun a sa propre catégorie.</Empty>}
      {data.goals.map((goal) => {
        const p = goalProgress(goal, data.transactions, today);
        return (
          <Card key={goal.id}>
            <View style={rowStyle}>
              <Txt bold>{goal.name}</Txt>
              <Txt bold color={p.reached ? t.pos : t.text}>{Math.round(p.ratio * 100)} %</Txt>
            </View>
            <ProgressBar ratio={p.ratio} color={p.reached ? t.pos : t.primary} />
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 }}>
              <Button title="Verser" variant="ghost" onPress={() => openAdd({ type: 'expense', categoryId: goal.categoryId })} />
              <Button title="Retirer" variant="ghost" onPress={() => openAdd({ type: 'income', categoryId: goal.categoryId })} />
            </View>
          </Card>
        );
      })}

      <SectionTitle>Nouvel objectif</SectionTitle>
      <Card>
        <Field label="Nom" value={name} onChangeText={setName} placeholder="Voyage, Apport..." />
        <Field label="Montant à atteindre (€)" value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="3000,00" />
        <View style={[rowStyle, { marginBottom: 8 }]}>
          <Txt>Date cible</Txt>
          <Switch value={hasDate} onValueChange={setHasDate} />
        </View>
        {hasDate && (
          <DateTimePicker value={date} mode="date" display="compact" minimumDate={new Date()} locale="fr-FR"
            onChange={(_, d) => d && setDate(d)} style={{ alignSelf: 'flex-start', marginBottom: 12 }} />
        )}
        <Button title="Créer l'objectif" onPress={create} />
      </Card>
    </Screen>
  );
}
