import { useColorScheme } from 'react-native';

const light = {
  bg: '#f4f5f7', card: '#ffffff', text: '#111827', sub: '#6b7280', border: '#e5e7eb',
  primary: '#2563eb', onPrimary: '#ffffff', pos: '#15803d', neg: '#b91c1c', warn: '#b45309', track: '#e5e7eb',
};
const dark: typeof light = {
  bg: '#0b0d12', card: '#161a22', text: '#f3f4f6', sub: '#9ca3af', border: '#262b36',
  primary: '#60a5fa', onPrimary: '#0b0d12', pos: '#4ade80', neg: '#f87171', warn: '#fbbf24', track: '#262b36',
};

export type Theme = typeof light;
export const useTheme = (): Theme => (useColorScheme() === 'dark' ? dark : light);
