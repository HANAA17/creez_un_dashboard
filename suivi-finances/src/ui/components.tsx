import React from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { formatAmount, type Cents } from '../domain';
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

export const rowStyle = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
}).row;

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 48, gap: 12 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  section: { marginTop: 8, marginLeft: 4, letterSpacing: 0.5 },
  button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
});
