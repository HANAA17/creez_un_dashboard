import { useColorScheme } from 'react-native';
import type { Category } from '../domain';

/**
 * Couleurs de catégories : les 8 teintes de la palette catégorielle validée (contraste, daltonisme),
 * dans leur version claire et sombre, plus un gris neutre. La catégorie stocke la CLÉ, pas le code :
 * la couleur s'adapte au mode sombre et ne change jamais selon le rang ou le filtre.
 */
export const COLOR_KEYS = ['blue', 'orange', 'aqua', 'yellow', 'magenta', 'green', 'violet', 'red', 'gray'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

const LIGHT: Record<ColorKey, string> = {
  blue: '#2a78d6', orange: '#eb6834', aqua: '#1baf7a', yellow: '#eda100', magenta: '#e87ba4',
  green: '#008300', violet: '#6250d6', red: '#e34948', gray: '#8a8996',
};
const DARK: Record<ColorKey, string> = {
  blue: '#3987e5', orange: '#d95926', aqua: '#199e70', yellow: '#c98500', magenta: '#d55181',
  green: '#008300', violet: '#9085e9', red: '#e66767', gray: '#a3a2b0',
};

export const LABELS: Record<ColorKey, string> = {
  blue: 'Bleu', orange: 'Orange', aqua: 'Turquoise', yellow: 'Jaune', magenta: 'Rose',
  green: 'Vert', violet: 'Violet', red: 'Rouge', gray: 'Gris',
};

export const useSeriesColors = (): Record<ColorKey, string> => (useColorScheme() === 'dark' ? DARK : LIGHT);

const isKey = (k: unknown): k is ColorKey => typeof k === 'string' && (COLOR_KEYS as readonly string[]).includes(k);

/** Couleur choisie, sinon une teinte stable déduite de l'identifiant (jamais le gris, réservé à « Autres »). */
export function categoryColorKey(c?: Pick<Category, 'id' | 'color'> | null): ColorKey {
  if (c && isKey(c.color)) return c.color;
  const id = c?.id ?? '';
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLOR_KEYS[h % 8]!;
}
