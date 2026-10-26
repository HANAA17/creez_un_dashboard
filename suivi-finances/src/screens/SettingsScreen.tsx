import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert, Switch, View } from 'react-native';
import { useData } from '../state/DataContext';
import { Button, Card, Screen, Segmented, SectionTitle, Txt, rowStyle } from '../ui/components';

export function SettingsScreen() {
  const { lockEnabled, setLockEnabled, exportBackup, importBackup, currency, setCurrency } = useData();

  const toggleLock = async (on: boolean) => {
    if (on) {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level === LocalAuthentication.SecurityLevel.NONE) {
        return Alert.alert('Verrouillage impossible', "Active d'abord un code, Face ID ou Touch ID dans les réglages de l'iPhone.");
      }
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Activer le verrouillage' });
      if (!res.success) return;
    }
    await setLockEnabled(on);
  };

  const doExport = async () => {
    try {
      const uri = `${FileSystem.cacheDirectory}sauvegarde-finances-${new Date().toISOString().slice(0, 10)}.json`;
      await FileSystem.writeAsStringAsync(uri, exportBackup());
      if (!(await Sharing.isAvailableAsync())) return Alert.alert('Partage indisponible', 'Impossible de partager le fichier sur cet appareil.');
      await Sharing.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json' });
    } catch (e) {
      Alert.alert('Export impossible', e instanceof Error ? e.message : String(e));
    }
  };

  const doImport = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true });
    const file = picked.assets?.[0];
    if (picked.canceled || !file) return;
    try {
      const text = await FileSystem.readAsStringAsync(file.uri);
      Alert.alert('Remplacer toutes tes données ?', 'Les données actuelles seront effacées et remplacées par celles de la sauvegarde.', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Remplacer', style: 'destructive',
          onPress: () => importBackup(text).then(
            () => Alert.alert('Sauvegarde restaurée'),
            (e) => Alert.alert('Import impossible', e instanceof Error ? e.message : String(e)),
          ),
        },
      ]);
    } catch (e) {
      Alert.alert('Import impossible', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen>
      <SectionTitle>Devise</SectionTitle>
      <Card>
        <Segmented options={[['MAD', 'Dirham (DH)'], ['EUR', 'Euro (€)']]} value={currency} onChange={(c) => setCurrency(c)} />
        <Txt sub size={13}>Change seulement l'affichage : les montants déjà saisis ne sont pas convertis.</Txt>
      </Card>

      <SectionTitle>Sécurité</SectionTitle>
      <Card>
        <View style={rowStyle}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Txt>Verrouiller l'app</Txt>
            <Txt sub size={13}>Face ID, Touch ID ou code de l'iPhone</Txt>
          </View>
          <Switch value={lockEnabled} onValueChange={toggleLock} />
        </View>
      </Card>

      <SectionTitle>Sauvegarde</SectionTitle>
      <Card>
        <Txt sub size={13} style={{ marginBottom: 8 }}>
          Tes données sont uniquement sur ce téléphone. Exporte régulièrement un fichier (dans Fichiers ou iCloud Drive) : sans lui, elles sont perdues si tu perds ou changes d'iPhone.
        </Txt>
        <Button title="Exporter une sauvegarde" onPress={doExport} />
        <Button title="Restaurer une sauvegarde" variant="ghost" onPress={doImport} />
      </Card>
    </Screen>
  );
}
