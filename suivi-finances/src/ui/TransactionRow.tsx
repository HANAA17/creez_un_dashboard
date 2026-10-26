import React from 'react';
import { Pressable, View } from 'react-native';
import type { Transaction } from '../domain';
import { useData } from '../state/DataContext';
import { IconBubble, Money, Txt } from './components';
import { useSeriesColors } from './palette';
import { useTheme } from './theme';
import { useCategoryLook } from './useCategory';

/** Une ligne de transaction : pastille de catégorie, libellé, détail et montant signé. */
export function TransactionRow({ tx, onPress, divider }: { tx: Transaction; onPress?: () => void; divider?: boolean }) {
  const { data } = useData();
  const t = useTheme();
  const colors = useSeriesColors();
  const look = useCategoryLook();
  const account = (id: string) => data.accounts.find((a) => a.id === id)?.name ?? '?';

  let title: string, sub: string, icon: React.ComponentProps<typeof IconBubble>['icon'], color: string;
  if (tx.type === 'transfer') {
    title = 'Virement';
    sub = `${account(tx.fromAccountId)} → ${account(tx.toAccountId)}`;
    icon = 'swap-horizontal'; color = colors.violet;
  } else {
    const c = look(tx.categoryId);
    const cat = data.categories.find((x) => x.id === tx.categoryId);
    title = cat?.kind === 'savings' ? `${c.name} · ${tx.type === 'expense' ? 'versement' : 'retrait'}` : c.name;
    sub = [account(tx.accountId), tx.note].filter(Boolean).join(' · ');
    icon = c.icon; color = c.color;
  }
  if (tx.recurrenceId) sub = sub ? `${sub} · répétée` : 'répétée';

  return (
    <Pressable onPress={onPress} disabled={!onPress}
      style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 }, divider && { borderTopWidth: 0.5, borderTopColor: t.border }]}>
      <IconBubble icon={icon} color={color} size={38} />
      <View style={{ flex: 1 }}>
        <Txt>{title}</Txt>
        {!!sub && <Txt sub size={13}>{sub}</Txt>}
      </View>
      {tx.type === 'transfer' ? <Money cents={tx.amount} /> : <Money cents={tx.type === 'income' ? tx.amount : -tx.amount} signed />}
    </Pressable>
  );
}
