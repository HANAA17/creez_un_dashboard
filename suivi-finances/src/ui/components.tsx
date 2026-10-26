import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { currencySymbol, formatAmount, type Cents } from '../domain';
import { ICON_CHOICES, type IconName } from './icons';
import { COLOR_KEYS, LABELS, useSeriesColors, type ColorKey } from './palette';
import { useTheme } from './theme';

export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={[styles.screen, style]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }, style]}>{children}</View>;
}

export function Txt({ children, sub, bold, size, color, style }: {
  children: React.ReactNode; sub?: boolean; bold?: boolean; size?: number; color?: string; style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  return (
    <Text style={[{ color: color ?? (sub ? t.sub : t.text), fontSize: size ?? 16, fontWeight: bold ? '600' : '400' }, style]}>
      {children}
    </Text>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Txt bold size={13} sub style={styles.section}>{String(children).toUpperCase()}</Txt>;
}

export function Button({ title, onPress, variant = 'primary', disabled }: {
  title: string; onPress: () => void; variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean;
}) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.primary : 'transparent';
  const fg = variant === 'primary' ? t.onPrimary : variant === 'danger' ? t.neg : t.primary;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
      <Text style={{ color: fg, fontSize: 16, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!selected }}
      style={[styles.chip, { borderColor: selected ? t.primary : t.border, backgroundColor: selected ? t.primary : 'transparent' }]}>
      <Text style={{ color: selected ? t.onPrimary : t.text, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Txt sub size={13} style={{ marginBottom: 6 }}>{label}</Txt>
      <TextInput placeholderTextColor={t.sub} {...props}
        style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.card }]} />
    </View>
  );
}

export function ProgressBar({ ratio, color }: { ratio: number; color?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: t.track }]}>
      <View style={{ width: `${Math.min(1, Math.max(0, ratio)) * 100}%`, height: '100%', backgroundColor: color ?? t.primary, borderRadius: 4 }} />
    </View>
  );
}

/** Montant coloré : vert pour un gain, rouge pour une perte. */
export function Money({ cents, signed, size, bold }: { cents: Cents; signed?: boolean; size?: number; bold?: boolean }) {
  const t = useTheme();
  const color = !signed ? t.text : cents > 0 ? t.pos : cents < 0 ? t.neg : t.text;
  const text = (signed && cents > 0 ? '+' : '') + formatAmount(cents);
  return <Txt color={color} size={size} bold={bold}>{text}</Txt>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <Txt sub style={{ textAlign: 'center', marginVertical: 24 }}>{children}</Txt>;
}

/** Pastille ronde colorée avec une icône : identifie visuellement une catégorie ou un compte. */
export function IconBubble({ icon, color, size = 40 }: { icon: IconName; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={size * 0.52} color="#ffffff" />
    </View>
  );
}

/** Ligne « pastille + libellé + champ de montant » : répartition, plan mensuel. */
export function AmountRow({ icon, color, title, subtitle, value, onChange, placeholder = '0' }: {
  icon: IconName; color: string; title: string; subtitle?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <IconBubble icon={icon} color={color} size={38} />
      <View style={{ flex: 1 }}>
        <Txt>{title}</Txt>
        {!!subtitle && <Txt sub size={12}>{subtitle}</Txt>}
      </View>
      <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder={placeholder} placeholderTextColor={t.sub}
        style={{ width: 96, textAlign: 'right', borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, color: t.text, backgroundColor: t.card }} />
      <Txt sub size={13}>{currencySymbol()}</Txt>
    </View>
  );
}

/** Contrôle à segments (2 à 4 choix), plus lisible que des puces pour un choix exclusif. */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: Array<[T, string]>; value: T; onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: t.track }]}>
      {options.map(([k, label]) => {
        const on = k === value;
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={[styles.segment, on && { backgroundColor: t.card }]}>
            <Text style={{ color: on ? t.text : t.sub, fontWeight: on ? '600' : '400', fontSize: 14 }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ColorPicker({ value, onChange }: { value: ColorKey; onChange: (k: ColorKey) => void }) {
  const colors = useSeriesColors();
  const t = useTheme();
  return (
    <View style={styles.chipRow}>
      {COLOR_KEYS.map((k) => (
        <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="button" accessibilityLabel={LABELS[k]}
          accessibilityState={{ selected: value === k }}
          style={[styles.swatch, { backgroundColor: colors[k], borderColor: value === k ? t.text : 'transparent' }]}>
          {value === k && <Ionicons name="checkmark" size={18} color="#ffffff" />}
        </Pressable>
      ))}
    </View>
  );
}

export function IconPicker({ value, color, onChange }: { value: IconName; color: string; onChange: (i: IconName) => void }) {
  const t = useTheme();
  return (
    <View style={styles.chipRow}>
      {ICON_CHOICES.map((i) => {
        const on = i === value;
        return (
          <Pressable key={i} onPress={() => onChange(i)} accessibilityRole="button" accessibilityLabel={i}
            accessibilityState={{ selected: on }}
            style={[styles.iconCell, { backgroundColor: on ? color : t.track }]}>
            <Ionicons name={i} size={22} color={on ? '#ffffff' : t.sub} />
          </Pressable>
        );
      })}
    </View>
  );
}

export const rowStyle = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
}).row;

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 110, gap: 12 },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  section: { marginTop: 8, marginLeft: 4, letterSpacing: 0.5 },
  button: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 14 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  iconCell: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
