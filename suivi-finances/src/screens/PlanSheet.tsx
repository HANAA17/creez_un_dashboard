import React, { useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { envelopes, formatAmount, parseOptionalAmount, planTotal } from '../domain';
import { useData } from '../state/DataContext';
import { AmountRow, Button, Card, Screen, Txt, rowStyle } from '../ui/components';
import { useCategoryLook } from '../ui/useCategory';

/** Plan mensuel : la répartition habituelle à appliquer à chaque salaire. */
export function PlanSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible && <Form onClose={onClose} />}
    </Modal>
  );
}

function Form({ onClose }: { onClose: () => void }) {
  const { data, savePlan } = useData();
  const look = useCategoryLook();
  const list = envelopes(data.categories);
  const toInput = (cents: number) => (cents === 0 ? '' : (cents / 100).toFixed(2).replace('.', ',').replace(',00', ''));
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(list.map((c) => [c.id, toInput(data.budgets.find((b) => b.categoryId === c.id)?.amount ?? 0)])),
  );
  const [saving, setSaving] = useState(false);

  const parsed = list.map((c) => ({ categoryId: c.id, amount: parseOptionalAmount(values[c.id] ?? '') }));
  const total = planTotal(parsed.map((p) => ({ categoryId: p.categoryId, amount: p.amount ?? 0 })));

  const save = async () => {
    if (parsed.some((p) => p.amount === null)) return Alert.alert('Montant invalide', 'Exemple : 1500 ou 250,50.');
    setSaving(true);
    try {
      await savePlan(parsed.map((p) => ({ categoryId: p.categoryId, amount: p.amount! })));
      onClose();
    } catch (e) {
      Alert.alert('Enregistrement impossible', e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={rowStyle}>
        <Txt bold size={20}>Plan mensuel</Txt>
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </View>
      <Txt sub size={13}>Indique combien tu mets d'habitude dans chaque enveloppe à chaque salaire. Tu pourras le reprendre en un geste dans « Répartir ».</Txt>

      <Card style={{ paddingVertical: 6 }}>
        {list.map((c) => {
          const l = look(c.id);
          return <AmountRow key={c.id} icon={l.icon} color={l.color} title={c.name} value={values[c.id] ?? ''} onChange={(v) => setValues({ ...values, [c.id]: v })} />;
        })}
      </Card>

      <Card>
        <Txt sub size={13}>Total du plan</Txt>
        <Txt bold size={22}>{formatAmount(total)}</Txt>
        <Txt sub size={12}>par mois, à comparer avec ton salaire.</Txt>
      </Card>
      <Button title={saving ? 'Enregistrement…' : 'Enregistrer le plan'} onPress={save} disabled={saving} />
    </Screen>
  );
}
