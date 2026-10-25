import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Pressable, View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccountsScreen } from './src/screens/AccountsScreen';
import { AddTransactionSheet } from './src/screens/AddTransactionSheet';
import { BudgetsScreen } from './src/screens/BudgetsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LockGate } from './src/screens/LockGate';
import { SavingsScreen } from './src/screens/SavingsScreen';
import { SettingsSheet } from './src/screens/SettingsSheet';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { DataProvider, useData } from './src/state/DataContext';
import { UiProvider, useUi } from './src/ui/Ui';
import { useTheme } from './src/ui/theme';

const Tab = createBottomTabNavigator();

const TABS: Array<{ name: string; component: React.ComponentType; icon: keyof typeof Ionicons.glyphMap }> = [
  { name: 'Accueil', component: HomeScreen, icon: 'home-outline' },
  { name: 'Transactions', component: TransactionsScreen, icon: 'list-outline' },
  { name: 'Comptes', component: AccountsScreen, icon: 'wallet-outline' },
  { name: 'Budgets', component: BudgetsScreen, icon: 'pie-chart-outline' },
  { name: 'Épargne', component: SavingsScreen, icon: 'trending-up-outline' },
];

function Tabs() {
  const { openAdd, setSettingsOpen } = useUi();
  const t = useTheme();
  return (
    <Tab.Navigator screenOptions={{
      tabBarActiveTintColor: t.primary,
      headerLeft: () => (
        <Pressable onPress={() => setSettingsOpen(true)} accessibilityLabel="Réglages" style={{ marginLeft: 16 }}>
          <Ionicons name="settings-outline" size={22} color={t.primary} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable onPress={() => openAdd()} accessibilityLabel="Ajouter une transaction" style={{ marginRight: 16 }}>
          <Ionicons name="add-circle" size={30} color={t.primary} />
        </Pressable>
      ),
    }}>
      {TABS.map(({ name, component, icon }) => (
        <Tab.Screen key={name} name={name} component={component}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name={icon} size={size} color={color} /> }} />
      ))}
    </Tab.Navigator>
  );
}

function Root() {
  const { ready } = useData();
  const t = useTheme();
  const dark = useColorScheme() === 'dark';
  if (!ready) {
    return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: t.bg }}><ActivityIndicator /></View>;
  }
  return (
    <NavigationContainer theme={dark ? DarkTheme : DefaultTheme}>
      <Tabs />
      <AddTransactionSheet />
      <SettingsSheet />
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
