import React, { useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import { envelopeBalances, envelopes, formatAmount, parseAmount, poolSummary } from '../domain';
import { useData } from '../state/DataContext';
import { Button, Field, IconBubble, Screen, Txt, rowStyle } from '../ui/components';
import { useTheme } from '../ui/theme';
import { useCategoryLook } from '../ui/useCategory';

export interface TransferPreset { from?: string | null; to?: string | null; amount?: number }

/** Déplacer de l'argent entre deux enveloppes, ou entre une enveloppe et « À répartir » (null). */
export function TransferSheet({ preset, onClose }: { preset: TransferPreset | null; onClose: () => void }) {
  return (
    <Modal visible={preset !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {preset !== null && <TransferForm preset={preset} onClose={onClose} />}
    </Modal>
  );
}

function Choice({ label, sub, icon, color, selected, onPress }: {
  label: string; sub: string; icon: React.ComponentProps<typeof IconBubble>['icon']; color: string; selected: boolean; onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingLeft: 5, paddingRight: 12, borderRadius: 22, borderWidth: selected ? 2 : 1, borderColor: selected ? color : t.border, backgroundColor: t.card }}>
      <IconBubble icon={icon} color={color} size={28} />
      <View>
        <Text style={{ color: t.text, fontSize: 14 }}>{label}</Text>
        <Text style={{ color: t.sub, fontSize: 11 }}>{sub}</Text>
      </View>
    </Pressable>
  );
}

export function TransferForm({ preset, onClose }: { preset: TransferPreset; onClose: () => void }) {
  const { data, env, today, transferBetween } = useData();
  const t = useTheme();
  const look = useCategoryLook();
  const pool = poolSummary(data.accounts, env, today);
  const balances = envelopeBalances(env, today);
  const list = envelopes(data.categories);

  const [from, setFrom] = useState<string | null>(preset.from === undefined ? null : preset.from);
  const [to, setTo] = useState<string | null>(preset.to === undefined ? (list.find((c) => c.id !== preset.from)?.id ?? null) : preset.to);
  const [amount, setAmount] = useState(preset.amount ? (preset.amount / 100).toFixed(2).replace('.', ',').replace(',00', '') : '');
  const [saving, setSaving] = useState(false);

  const nameOf = (id: string | null) => (id === null ? 'À répartir' : look(id).name);
  const available = (id: string | null) => (id === null ? pool.toAllocate : (balances.get(id) ?? 0));

  const run = async (cents: number) => {
    setSaving(true);
    try {
      await transferBetween({ from, to, amount: cents });
      onClose();
    } catch (e) {
      Alert.alert('Transfert impossible', e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const save = () => {
    const cents = parseAmount(amount);
    if (cents === null) return Alert.alert('Montant invalide', 'Exemple : 200 ou 150,50.');
    if (from === to) return Alert.alert('Choisis deux enveloppes différentes');
    if (cents > available(from)) {
      return Alert.alert(
        `« ${nameOf(from)} » n'a pas assez`,
        `Il y a ${formatAmount(available(from))} disponibles. Après ce transfert, elle sera à ${formatAmount(available(from) - cents)}. Continuer ?`,
        [{ text: 'Annuler', style: 'cancel' }, { text: 'Continuer', onPress: () => run(cents) }],
      );
    }
    return run(cents);
  };

  const options = (selected: string | null, set: (id: string | null) => void, exclude: string | null | undefined) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
      {exclude !== null && <Choice label="À répartir" sub={formatAmount(pool.toAllocate)} icon="cash" color={t.primary} selected={selected === null} onPress={() => set(null)} />}
      {list.filter((c) => c.id !== exclude).map((c) => {
        const l = look(c.id);
        return <Choice key={c.id} label={c.name} sub={formatAmount(balances.get(c.id) ?? 0)} icon={l.icon} color={l.color} selected={selected === c.id} onPress={() => set(c.id)} />;
      })}
    </View>
  );

  return (
    <Screen>
      <View style={rowStyle}>
        <Txt bold size={20}>Transférer</Txt>
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </View>
      <Txt sub size={13}>Déplace de l'argent d'une enveloppe à une autre. Rien ne bouge sur tes comptes.</Txt>

      <Txt sub size={13}>De</Txt>
      {options(from, setFrom, to)}
      <Txt sub size={13}>Vers</Txt>
      {options(to, setTo, from)}

      <Field label="Montant" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" />
      <Button title={saving ? 'Transfert…' : `Transférer de « ${nameOf(from)} » vers « ${nameOf(to)} »`} onPress={save} disabled={saving} />
    </Screen>
  );
}
