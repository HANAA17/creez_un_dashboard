import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Alert, Pressable, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddTransactionSheet } from './src/screens/AddTransactionSheet';
import { EnvelopesScreen } from './src/screens/EnvelopesScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LockGate } from './src/screens/LockGate';
import { MoreScreen } from './src/screens/MoreScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { DataProvider, useData } from './src/state/DataContext';
import { UiProvider, useUi } from './src/ui/Ui';
import { useTheme } from './src/ui/theme';

const Tab = createBottomTabNavigator();

const TABS: Array<{ name: string; component: React.ComponentType<any>; icon: keyof typeof Ionicons.glyphMap; label?: string }> = [
  { name: 'Accueil', component: HomeScreen, icon: 'home' },
  { name: 'Transactions', component: TransactionsScreen, icon: 'list' },
  { name: 'Statistiques', component: StatsScreen, icon: 'pie-chart' },
  { name: 'Enveloppes', component: EnvelopesScreen, icon: 'layers' },
  { name: 'Plus', component: MoreScreen, icon: 'grid' },
];

function Tabs() {
  const t = useTheme();
  return (
    <Tab.Navigator screenOptions={{
      tabBarActiveTintColor: t.primary,
      tabBarInactiveTintColor: t.sub,
      tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
      headerStyle: { backgroundColor: t.bg },
      headerShadowVisible: false,
      headerTitleStyle: { fontWeight: '700', color: t.text },
      sceneStyle: { backgroundColor: t.bg },
    }}>
      {TABS.map(({ name, component, icon }) => (
        <Tab.Screen key={name} name={name} component={component}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name={icon} size={size} color={color} /> }} />
      ))}
    </Tab.Navigator>
  );
}

/** Bouton « + » flottant : ajouter une transaction depuis n'importe quel écran. */
function AddButton() {
  const { openAdd } = useUi();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable onPress={() => openAdd()} accessibilityRole="button" accessibilityLabel="Ajouter une transaction"
      style={({ pressed }) => ({
        position: 'absolute', right: 20, bottom: insets.bottom + 49 + 16, width: 58, height: 58, borderRadius: 29,
        backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1,
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
      })}>
      <Ionicons name="add" size={32} color={t.onPrimary} />
    </Pressable>
  );
}

function Root() {
  const { ready, migrationNotice, dismissMigrationNotice } = useData();
  const t = useTheme();
  const dark = useColorScheme() === 'dark';

  // Après la mise à niveau vers les enveloppes, on explique une fois ce qui a été converti.
  React.useEffect(() => {
    if (!ready || !migrationNotice) return;
    const { converted, removedRules } = migrationNotice;
    const lines = [
      'Ton budget fonctionne maintenant par enveloppes : tu répartis ton argent par catégorie et ce qui reste se cumule.',
      converted > 0
        ? `${converted} versement${converted > 1 ? 's' : ''} d'épargne converti${converted > 1 ? 's' : ''} en réservation. Ils ne sont plus des dépenses : les soldes de tes comptes peuvent avoir changé, vérifie-les.`
        : null,
      removedRules > 0
        ? `${removedRules} planification${removedRules > 1 ? 's' : ''} d'épargne retirée${removedRules > 1 ? 's' : ''} : utilise le plan mensuel.`
        : null,
      "Ton argent est dans « À répartir » : ouvre l'onglet Enveloppes pour le répartir.",
    ].filter(Boolean);
    Alert.alert('Nouveau : les enveloppes', lines.join('\n\n'), [{ text: 'Compris', onPress: () => dismissMigrationNotice() }]);
  }, [ready, migrationNotice, dismissMigrationNotice]);

  if (!ready) {
    return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: t.bg }}><ActivityIndicator /></View>;
  }
  return (
    <NavigationContainer theme={{
      ...(dark ? DarkTheme : DefaultTheme),
      colors: { ...(dark ? DarkTheme : DefaultTheme).colors, background: t.bg, card: t.card, text: t.text, border: t.border, primary: t.primary },
    }}>
      <View style={{ flex: 1 }}>
        <Tabs />
        <AddButton />
      </View>
      <AddTransactionSheet />
      <LockGate />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <UiProvider>
          <Root />
        </UiProvider>
      </DataProvider>
    </SafeAreaProvider>
  );
}
