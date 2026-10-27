import React, { useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import type { Category, CategoryKind } from '../domain';
import { useData } from '../state/DataContext';
import { Button, Card, ColorPicker, Field, IconBubble, IconPicker, Screen, SectionTitle, Txt, rowStyle } from '../ui/components';
import { DeleteCategorySheet } from './DeleteCategorySheet';
import { categoryIcon, type IconName } from '../ui/icons';
import { COLOR_KEYS, categoryColorKey, useSeriesColors, type ColorKey } from '../ui/palette';

const KIND_LABEL: Record<CategoryKind, string> = { expense: 'de dépense', income: 'de revenu', savings: "d'épargne" };

/** Fenêtre de création / modification d'une catégorie : nom, couleur, icône. */
export function CategoryEditor({ visible, kind, category, onClose, onSaved }: {
  visible: boolean; kind: CategoryKind; category?: Category | null; onClose: () => void; onSaved?: (c: Category) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible && <CategoryForm kind={category?.kind ?? kind} category={category ?? null} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

export function CategoryForm({ kind, category, onClose, onSaved }: {
  kind: CategoryKind; category: Category | null; onClose: () => void; onSaved?: (c: Category) => void;
}) {
  const { data, addCategory, updateCategory, setCategoryArchived } = useData();
  const colors = useSeriesColors();

  // Pour une nouvelle catégorie, on propose d'abord une couleur pas encore utilisée par ce type.
  const suggested = (): ColorKey => {
    const used = new Set(data.categories.filter((c) => c.kind === kind).map((c) => categoryColorKey(c)));
    return COLOR_KEYS.slice(0, 8).find((k) => !used.has(k)) ?? 'blue';
  };

  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState<ColorKey>(category ? categoryColorKey(category) : suggested());
  const [icon, setIcon] = useState<IconName>(category ? categoryIcon(category) : categoryIcon({ icon: null, kind }));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (category) {
        await updateCategory(category.id, { name, icon, color });
        onSaved?.({ ...category, name: name.trim(), icon, color });
      } else {
        onSaved?.(await addCategory({ name, kind, icon, color }));
      }
      onClose();
    } catch (e) {
      Alert.alert('Enregistrement impossible', e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const archive = () =>
    Alert.alert(`Archiver « ${category?.name} » ?`, "Elle n'apparaîtra plus dans les listes, mais ses transactions passées sont conservées. Tu pourras la restaurer.", [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Archiver', style: 'destructive', onPress: async () => { await setCategoryArchived(category!.id, true); onClose(); } },
    ]);

  const linkedToGoal = !!category && data.goals.some((g) => g.categoryId === category.id);

  return (
    <Screen>
      <View style={rowStyle}>
        <Txt bold size={20}>{category ? 'Modifier la catégorie' : `Catégorie ${KIND_LABEL[kind]}`}</Txt>
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </View>

      <Card style={{ alignItems: 'center', gap: 8 }}>
        <IconBubble icon={icon} color={colors[color]} size={64} />
        <Txt bold size={18}>{name.trim() || 'Nom de la catégorie'}</Txt>
      </Card>

      <Field label="Nom" value={name} onChangeText={setName} placeholder="Ex. Cantine, Cadeaux, Prime…" autoFocus={!category} />
      <SectionTitle>Couleur</SectionTitle>
      <ColorPicker value={color} onChange={setColor} />
      <SectionTitle>Icône</SectionTitle>
      <IconPicker value={icon} color={colors[color]} onChange={setIcon} />

      <Button title={saving ? 'Enregistrement…' : 'Enregistrer'} onPress={save} disabled={saving || !name.trim()} />
      {category && !linkedToGoal && !category.archived && <Button title="Archiver cette catégorie" variant="ghost" onPress={archive} />}
      {category && <Button title="Supprimer cette catégorie" variant="danger" onPress={() => setDeleting(true)} />}
      {linkedToGoal && <Txt sub size={13} style={{ textAlign: 'center' }}>Cette catégorie est l'enveloppe d'un objectif d'épargne : elle ne s'archive pas, mais peut être supprimée avec son objectif.</Txt>}
      <DeleteCategorySheet category={deleting ? category : null} onClose={() => setDeleting(false)} onDeleted={() => { setDeleting(false); onClose(); }} />
    </Screen>
  );
}
