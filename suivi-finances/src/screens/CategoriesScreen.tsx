import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Category, CategoryKind } from '../domain';
import { useData } from '../state/DataContext';
import { Button, Card, Empty, IconBubble, Screen, Segmented, SectionTitle, Txt, rowStyle } from '../ui/components';
import { Ionicons } from '@expo/vector-icons';
import { useCategoryLook } from '../ui/useCategory';
import { useTheme } from '../ui/theme';
import { CategoryEditor } from './CategoryEditor';

const KINDS: Array<[CategoryKind, string]> = [['expense', 'Dépenses'], ['income', 'Revenus'], ['savings', 'Épargne']];

export function CategoriesScreen() {
  const { data, setCategoryArchived } = useData();
  const look = useCategoryLook();
  const t = useTheme();
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const all = data.categories.filter((c) => c.kind === kind);
  const active = all.filter((c) => !c.archived);
  const archived = all.filter((c) => c.archived);
  const usage = (id: string) => data.transactions.filter((x) => x.type !== 'transfer' && x.categoryId === id).length;

  return (
    <Screen>
      <Segmented options={KINDS} value={kind} onChange={setKind} />

      {active.length === 0 && <Empty>Aucune catégorie.</Empty>}
      {active.length > 0 && (
        <Card style={{ paddingVertical: 4 }}>
          {active.map((c, i) => {
            const l = look(c.id);
            const n = usage(c.id);
            return (
              <Pressable key={c.id} onPress={() => setEditing(c)}
                style={[rowStyle, { gap: 12 }, i > 0 && { borderTopWidth: 0.5, borderTopColor: t.border }]}>
                <IconBubble icon={l.icon} color={l.color} size={38} />
                <View style={{ flex: 1 }}>
                  <Txt>{c.name}</Txt>
                  <Txt sub size={13}>{n === 0 ? 'Aucune transaction' : `${n} transaction${n > 1 ? 's' : ''}`}</Txt>
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.sub} />
              </Pressable>
            );
          })}
        </Card>
      )}

      {kind === 'savings'
        ? <Txt sub size={13}>Les catégories d'épargne se créent avec un objectif, dans l'onglet Épargne. Tu peux ici changer leur nom, leur couleur et leur icône.</Txt>
        : <Button title="Nouvelle catégorie" onPress={() => setCreating(true)} />}

      {archived.length > 0 && (
        <>
          <SectionTitle>Archivées</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>
            {archived.map((c) => (
              <View key={c.id} style={rowStyle}>
                <Txt sub>{c.name}</Txt>
                <Button title="Restaurer" variant="ghost" onPress={() => setCategoryArchived(c.id, false)} />
              </View>
            ))}
          </Card>
        </>
      )}

      <CategoryEditor visible={creating} kind={kind} onClose={() => setCreating(false)} />
      <CategoryEditor visible={editing !== null} kind={kind} category={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}
