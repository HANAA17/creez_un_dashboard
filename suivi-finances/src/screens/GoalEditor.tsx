import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Alert, Modal, Switch, View } from 'react-native';
import { currencySymbol, parseAmount, type Goal } from '../domain';
import { useData } from '../state/DataContext';
import { Button, Card, ColorPicker, Field, IconBubble, IconPicker, Screen, Txt, rowStyle } from '../ui/components';
import { dateToIso, isoToDate } from '../ui/format';
import { categoryIcon } from '../ui/icons';
import { categoryColorKey, useSeriesColors, type ColorKey } from '../ui/palette';
import { DeleteCategorySheet } from './DeleteCategorySheet';

/** Modification d'un objectif d'épargne : nom, montant cible, date, couleur, icône ; suppression. */
export function GoalEditor({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  return (
    <Modal visible={goal !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {goal !== null && <Form goal={goal} onClose={onClose} />}
    </Modal>
  );
}

function Form({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { data, updateCategory, updateGoal } = useData();
  const colors = useSeriesColors();
  const category = data.categories.find((c) => c.id === goal.categoryId) ?? null;
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState((goal.target / 100).toFixed(2).replace('.', ',').replace(',00', ''));
  const [hasDate, setHasDate] = useState(!!goal.targetDate);
  const [date, setDate] = useState(goal.targetDate ? isoToDate(goal.targetDate) : new Date());
  const [color, setColor] = useState<ColorKey>(categoryColorKey(category));
  const [icon, setIcon] = useState(categoryIcon(category));
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    const cents = parseAmount(target);
    if (!name.trim()) return Alert.alert('Nom manquant', "Donne un nom à l'objectif.");
    if (cents === null) return Alert.alert('Montant invalide', 'Exemple : 3000 ou 3000,50.');
    setBusy(true);
    try {
      await updateCategory(goal.categoryId, { name, icon, color });
      await updateGoal(goal.id, { name, target: cents, targetDate: hasDate ? dateToIso(date) : undefined });
      onClose();
    } catch (e) {
      Alert.alert('Enregistrement impossible', e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={rowStyle}>
        <Txt bold size={20}>Modifier l'objectif</Txt>
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </View>
      <Card style={{ alignItems: 'center', gap: 8 }}>
        <IconBubble icon={icon} color={colors[color]} size={56} />
        <Txt bold size={18}>{name.trim() || "Nom de l'objectif"}</Txt>
      </Card>
      <Field label="Nom" value={name} onChangeText={setName} />
      <Field label={`Montant à atteindre (${currencySymbol()})`} value={target} onChangeText={setTarget} keyboardType="decimal-pad" />
      <View style={[rowStyle, { marginBottom: 8 }]}>
        <Txt>Date cible</Txt>
        <Switch value={hasDate} onValueChange={setHasDate} />
      </View>
      {hasDate && <DateTimePicker value={date} mode="date" display="compact" locale="fr-FR" onChange={(_, d) => d && setDate(d)} style={{ alignSelf: 'flex-start', marginBottom: 12 }} />}
      <Txt sub size={13} style={{ marginBottom: 8 }}>Couleur</Txt>
      <ColorPicker value={color} onChange={setColor} />
      <Txt sub size={13} style={{ marginBottom: 8 }}>Icône</Txt>
      <IconPicker value={icon} color={colors[color]} onChange={setIcon} />
      <Button title={busy ? 'Enregistrement…' : 'Enregistrer'} onPress={save} disabled={busy} />
      <Button title="Supprimer l'objectif" variant="danger" onPress={() => setDeleting(true)} />
      <DeleteCategorySheet category={deleting ? category : null} onClose={() => setDeleting(false)} onDeleted={() => { setDeleting(false); onClose(); }} />
    </Screen>
  );
}
