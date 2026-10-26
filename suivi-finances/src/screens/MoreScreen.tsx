import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { IconBubble, Screen, Txt } from '../ui/components';
import type { IconName } from '../ui/icons';
import { useSeriesColors, type ColorKey } from '../ui/palette';
import { useTheme } from '../ui/theme';
import { AccountsScreen } from './AccountsScreen';
import { CategoriesScreen } from './CategoriesScreen';
import { RecurrencesScreen } from './RecurrencesScreen';
import { SavingsScreen } from './SavingsScreen';
import { SettingsScreen } from './SettingsScreen';

type Page = 'accounts' | 'savings' | 'recurrences' | 'categories' | 'settings';

const PAGES: Array<{ key: Page; title: string; hint: string; icon: IconName; color: ColorKey; Component: React.ComponentType }> = [
  { key: 'accounts', title: 'Comptes', hint: 'Courant, livrets, espèces', icon: 'wallet', color: 'blue', Component: AccountsScreen },
  { key: 'savings', title: 'Épargne', hint: 'Objectifs et versements', icon: 'trending-up', color: 'green', Component: SavingsScreen },
  { key: 'recurrences', title: 'Planifications', hint: 'Revenus et dépenses récurrents', icon: 'repeat', color: 'violet', Component: RecurrencesScreen },
  { key: 'categories', title: 'Catégories', hint: 'Créer, colorer, choisir des icônes', icon: 'pricetags', color: 'orange', Component: CategoriesScreen },
  { key: 'settings', title: 'Réglages et sauvegarde', hint: 'Verrouillage, export, restauration', icon: 'settings', color: 'gray', Component: SettingsScreen },
];

/** Onglet « Plus » : menu vers les écrans de gestion, avec un retour en haut de chaque sous-écran. */
export function MoreScreen() {
  const t = useTheme();
  const colors = useSeriesColors();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const [page, setPage] = useState<Page | null>(null);

  // Permet à d'autres écrans d'ouvrir directement une page : navigate('Plus', { page: 'accounts' }).
  useEffect(() => {
    const p = route.params?.page as Page | undefined;
    if (p) {
      setPage(p);
      nav.setParams({ page: undefined });
    }
  }, [route.params?.page, nav]);

  const current = PAGES.find((p) => p.key === page);
  if (current) {
    const { Component } = current;
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Pressable onPress={() => setPage(null)} accessibilityRole="button" accessibilityLabel="Retour"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingTop: 12 }}>
          <Ionicons name="chevron-back" size={22} color={t.primary} />
          <Txt color={t.primary}>Plus</Txt>
          <Txt bold size={20} style={{ marginLeft: 10 }}>{current.title}</Txt>
        </Pressable>
        <View style={{ flex: 1 }}><Component /></View>
      </View>
    );
  }

  return (
    <Screen>
      {PAGES.map((p) => (
        <Pressable key={p.key} onPress={() => setPage(p.key)} accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.card, borderRadius: 18, padding: 14, borderWidth: 0.5, borderColor: t.border }}>
          <IconBubble icon={p.icon} color={colors[p.color]} size={44} />
          <View style={{ flex: 1 }}>
            <Txt bold>{p.title}</Txt>
            <Txt sub size={13}>{p.hint}</Txt>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.sub} />
        </Pressable>
      ))}
    </Screen>
  );
}
