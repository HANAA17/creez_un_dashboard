import { useCallback } from 'react';
import type { Category } from '../domain';
import { useData } from '../state/DataContext';
import { categoryIcon, type IconName } from './icons';
import { categoryColorKey, useSeriesColors } from './palette';

export interface CategoryLook { name: string; icon: IconName; color: string }

/** Nom, icône et couleur d'une catégorie (avec valeurs de repli si elle est inconnue ou sans réglage). */
export function useCategoryLook(): (id: string | null | undefined) => CategoryLook {
  const { data } = useData();
  const colors = useSeriesColors();
  return useCallback((id) => {
    if (id === null) return { name: 'Autres', icon: 'ellipsis-horizontal-circle', color: colors.gray };
    const c: Category | undefined = data.categories.find((x) => x.id === id);
    return { name: c?.name ?? '?', icon: categoryIcon(c), color: colors[categoryColorKey(c ?? { id: id ?? '', color: null })] };
  }, [data.categories, colors]);
}
