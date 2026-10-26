import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Category } from '../domain';
import { IconBubble } from '../ui/components';
import { useTheme } from '../ui/theme';
import { useCategoryLook } from '../ui/useCategory';
import { CategoryEditor } from './CategoryEditor';

/** Choix de catégorie par pastilles à icône, avec « Nouvelle » qui ouvre l'éditeur. */
export function CategoryChips({ categories, kind, selectedId, onSelect, allowNew = true }: {
  categories: Category[]; kind: 'expense' | 'income'; selectedId: string; onSelect: (id: string) => void; allowNew?: boolean;
}) {
  const t = useTheme();
  const look = useCategoryLook();
  const [creating, setCreating] = useState(false);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
      {categories.map((c) => {
        const l = look(c.id);
        const on = c.id === selectedId;
        return (
          <Pressable key={c.id} onPress={() => onSelect(c.id)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingLeft: 5, paddingRight: 12, borderRadius: 22, borderWidth: on ? 2 : 1, borderColor: on ? l.color : t.border, backgroundColor: t.card }}>
            <IconBubble icon={l.icon} color={l.color} size={28} />
            <Text style={{ color: t.text, fontSize: 14 }}>{c.kind === 'savings' ? `${c.name} · épargne` : c.name}</Text>
          </Pressable>
        );
      })}
      {allowNew && <Pressable onPress={() => setCreating(true)} accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: t.primary }}>
        <Ionicons name="add" size={16} color={t.primary} />
        <Text style={{ color: t.primary, fontSize: 14 }}>Nouvelle</Text>
      </Pressable>}
      <CategoryEditor visible={creating} kind={kind} onClose={() => setCreating(false)} onSaved={(c) => onSelect(c.id)} />
    </View>
  );
}
