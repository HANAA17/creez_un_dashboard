import React, { useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { envelopeBalances, envelopes, formatAmount, formatAmountShort, parseOptionalAmount, poolSummary } from '../domain';
import { useData } from '../state/DataContext';
import { AmountRow, Button, Card, Screen, Txt, rowStyle } from '../ui/components';
import { useTheme } from '../ui/theme';
import { useCategoryLook } from '../ui/useCategory';

/** Répartir l'argent « À répartir » dans les enveloppes, à la main ou avec le plan mensuel. */
export function AllocateSheet({ visible, fromPlan, onClose }: { visible: boolean; fromPlan?: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible && <Form fromPlan={!!fromPlan} onClose={onClose} />}
    </Modal>
  );
}

function Form({ fromPlan, onClose }: { fromPlan: boolean; onClose: () => void }) {
  const { data, env, today, allocate } = useData();
  const t = useTheme();
  const look = useCategoryLook();
  const pool = poolSummary(data.accounts, env, today);
  const balances = envelopeBalances(env, today);
  const list = envelopes(data.categories);
  const planOf = (id: string) => data.budgets.find((b) => b.categoryId === id)?.amount ?? 0;
  const toInput = (cents: number) => (cents === 0 ? '' : (cents / 100).toFixed(2).replace('.', ',').replace(',00', ''));

  const [values, setValues] = useState<Record<string, string>>(
    fromPlan ? Object.fromEntries(list.map((c) => [c.id, toInput(planOf(c.id))])) : {},
  );
  const [saving, setSaving] = useState(false);

  const parsed = list.map((c) => ({ id: c.id, cents: parseOptionalAmount(values[c.id] ?? '') }));
  const invalid = parsed.some((p) => p.cents === null);
  const total = parsed.reduce((s, p) => s + (p.cents ?? 0), 0);
  const remaining = pool.toAllocate - total;

  const fillPlan = () => setValues(Object.fromEntries(list.map((c) => [c.id, toInput(planOf(c.id))])));

  const doSave = async () => {
    setSaving(true);
    try {
      await allocate(parsed.filter((p) => p.cents).map((p) => ({ categoryId: p.id, amount: p.cents! })), 'Répartition');
      onClose();
    } catch (e) {
      Alert.alert('Répartition impossible', e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const save = () => {
    if (invalid) return Alert.alert('Montant invalide', 'Vérifie les champs en rouge : exemple 1500 ou 250,50.');
    if (total === 0) return Alert.alert('Rien à répartir', 'Saisis au moins un montant, ou utilise ton plan mensuel.');
    if (remaining < 0) {
      return Alert.alert('Tu répartis plus que disponible', `Il te manque ${formatAmount(-remaining)}. Continuer quand même ?`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Continuer', onPress: doSave },
      ]);
    }
    return doSave();
  };

  return (
    <Screen>
      <View style={rowStyle}>
        <Txt bold size={20}>Répartir</Txt>
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </View>

      <Card>
        <Txt sub size={13}>À répartir</Txt>
        <Txt bold size={26}>{formatAmount(pool.toAllocate)}</Txt>
        <Txt size={14} color={remaining < 0 ? t.neg : remaining === 0 && total > 0 ? t.pos : t.sub} style={{ marginTop: 4 }}>
          {total === 0 ? 'Saisis ce que tu mets dans chaque enveloppe.' : remaining < 0 ? `Trop réparti de ${formatAmount(-remaining)}` : `Après cette répartition : ${formatAmount(remaining)} restent à répartir`}
        </Txt>
      </Card>

      <Button title="Remplir avec mon plan mensuel" variant="ghost" onPress={fillPlan} />

      <Card style={{ paddingVertical: 6 }}>
        {list.length === 0 && <Txt sub>Aucune enveloppe. Crée des catégories ou un objectif d'épargne.</Txt>}
        {list.map((c) => {
          const l = look(c.id);
          const plan = planOf(c.id);
          const bad = parsed.find((p) => p.id === c.id)?.cents === null;
          return (
            <AmountRow key={c.id} icon={l.icon} color={l.color} title={c.name}
              subtitle={`Actuel : ${formatAmount(balances.get(c.id) ?? 0)}${plan ? ` · plan ${formatAmountShort(plan)}` : ''}`}
              value={values[c.id] ?? ''} onChange={(v) => setValues({ ...values, [c.id]: v })} />
          );
        })}
      </Card>

      <Button title={saving ? 'Enregistrement…' : 'Valider la répartition'} onPress={save} disabled={saving} />
    </Screen>
  );
}
