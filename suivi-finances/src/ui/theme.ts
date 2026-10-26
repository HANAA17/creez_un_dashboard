import { useColorScheme } from 'react-native';

const light = {
  bg: '#f5f4fb', card: '#ffffff', text: '#14131a', sub: '#6b6a76', border: '#e7e5f0',
  primary: '#6250d6', onPrimary: '#ffffff', pos: '#006300', neg: '#d03b3b', warn: '#b45309',
  track: '#ebe9f5', grid: '#ecebf3', hero: ['#6250d6', '#2a78d6'] as [string, string],
};
const dark: typeof light = {
  bg: '#0f0e14', card: '#1a1923', text: '#f0efec', sub: '#a3a2b0', border: '#2b2a36',
  primary: '#9085e9', onPrimary: '#0f0e14', pos: '#4cc26a', neg: '#e66767', warn: '#fab219',
  track: '#2a2833', grid: '#2b2a36', hero: ['#4b3fb5', '#1f5fae'] as [string, string],
};

export type Theme = typeof light;
export const useTheme = (): Theme => (useColorScheme() === 'dark' ? dark : light);
