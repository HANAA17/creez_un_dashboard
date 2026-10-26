import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { formatAmount, isFinished, nextOccurrence, type RecurrenceRule } from '../domain';
import { useData } from '../state/DataContext';
import { Button, Card, Empty, IconBubble, Screen, SectionTitle, Txt } from '../ui/components';
import { frequencyLabel, shortDate } from '../ui/format';
import { useSeriesColors } from '../ui/palette';
import { useTheme } from '../ui/theme';
import { useCategoryLook } from '../ui/useCategory';
import { RecurrenceEditor } from './RecurrenceEditor';

export function RecurrencesScreen() {
  const { data } = useData();
  const t = useTheme();
  const colors = useSeriesColors();
  const look = useCategoryLook();
  const [editing, setEditing] = useState<RecurrenceRule | null>(null);
  const [creating, setCreating] = useState(false);

  const account = (id: string) => data.accounts.find((a) => a.id === id)?.name ?? '?';
  const next = (r: RecurrenceRule) => nextOccurrence(r) ?? '9999-12-31';
  const active = data.recurrences.filter((r) => !r.paused && !isFinished(r)).sort((a, b) => next(a).localeCompare(next(b)));
  const paused = data.recurrences.filter((r) => r.paused);
  const finished = data.recurrences.filter((r) => !r.paused && isFinished(r));

  const Row = ({ r, status, first }: { r: RecurrenceRule; status: string; first: boolean }) => {
    const tpl = r.template;
    const isTransfer = tpl.type === 'transfer';
    const l = isTransfer ? null : look(tpl.categoryId);
    const title = isTransfer ? `Virement ${account(tpl.fromAccountId)} → ${account(tpl.toAccountId)}` : l!.name;
    const sign = isTransfer ? '' : tpl.type === 'income' ? '+' : '−';
    return (
      <Pressable onPress={() => setEditing(r)}
        style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }, !first && { borderTopWidth: 0.5, borderTopColor: t.border }]}>
        <IconBubble icon={l?.icon ?? 'swap-horizontal'} color={l?.color ?? colors.violet} size={38} />
        <View style={{ flex: 1 }}>
          <Txt>{title}{tpl.note ? ` · ${tpl.note}` : ''}</Txt>
          <Txt sub size={13}>{sign}{formatAmount(tpl.amount)} · {frequencyLabel(r.frequency, r.interval)}</Txt>
          <Txt sub size={13}>{status}</Txt>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.sub} />
      </Pressable>
    );
  };

  return (
    <Screen>
      <Txt sub size={13}>Revenus, dépenses et virements qui se répètent (loyer, salaire, abonnements…). Les transactions sont créées automatiquement à chaque échéance, quand tu ouvres l'app.</Txt>
      <Button title="Nouvelle planification" onPress={() => setCreating(true)} />

      {data.recurrences.length === 0 && <Empty>Aucune planification pour l'instant.</Empty>}

      {active.length > 0 && (
        <>
          <SectionTitle>Actives</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>
            {active.map((r, i) => <Row key={r.id} r={r} first={i === 0} status={`Prochaine : ${shortDate(nextOccurrence(r)!)}`} />)}
          </Card>
        </>
      )}
      {paused.length > 0 && (
        <>
          <SectionTitle>En pause</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>
            {paused.map((r, i) => <Row key={r.id} r={r} first={i === 0} status="En pause" />)}
          </Card>
        </>
      )}
      {finished.length > 0 && (
        <>
          <SectionTitle>Terminées</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>
            {finished.map((r, i) => <Row key={r.id} r={r} first={i === 0} status={r.endDate ? `Terminée le ${shortDate(r.endDate)}` : 'Terminée'} />)}
          </Card>
        </>
      )}

      <RecurrenceEditor visible={creating} onClose={() => setCreating(false)} />
      <RecurrenceEditor visible={editing !== null} rule={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}
