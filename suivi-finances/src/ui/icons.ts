import type { Ionicons } from '@expo/vector-icons';
import type { Category, CategoryKind } from '../domain';

export type IconName = keyof typeof Ionicons.glyphMap;

/** Icônes proposées pour les catégories, regroupées par thème. */
export const ICON_CHOICES: IconName[] = [
  'home', 'bed', 'flash', 'water', 'wifi', 'phone-portrait',
  'cart', 'basket', 'restaurant', 'cafe', 'beer', 'pizza',
  'car', 'bus', 'train', 'airplane', 'bicycle', 'boat',
  'medkit', 'fitness', 'heart', 'paw', 'shirt', 'cut',
  'game-controller', 'film', 'musical-notes', 'book', 'school', 'camera',
  'gift', 'balloon', 'briefcase', 'construct', 'receipt', 'card',
  'cash', 'wallet', 'trending-up', 'trophy', 'diamond', 'umbrella',
  'repeat', 'pricetag', 'star', 'leaf', 'sunny', 'ellipsis-horizontal-circle',
];

const DEFAULT_BY_KIND: Record<CategoryKind, IconName> = {
  expense: 'pricetag', income: 'cash', savings: 'trending-up',
};

export function categoryIcon(c?: Pick<Category, 'icon' | 'kind'> | null): IconName {
  if (c?.icon && (ICON_CHOICES as string[]).includes(c.icon)) return c.icon as IconName;
  return DEFAULT_BY_KIND[c?.kind ?? 'expense'];
}
