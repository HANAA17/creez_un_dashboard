import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert, Modal, Switch, View } from 'react-native';
import { formatAmount, type RecurrenceRule } from '../domain';
import { useData } from '../state/DataContext';
import { useUi } from '../ui/Ui';
import { Button, Card, Empty, Screen, SectionTitle, Txt, rowStyle } from '../ui/components';
import { shortDate } from '../ui/format';

const FREQ = { weekly: 'chaque semaine', monthly: 'chaque mois', yearly: 'chaque année' } as const;

export function SettingsSheet() {
  const { settingsOpen, setSettingsOpen } = useUi();
  return (
    <Modal visible={settingsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSettingsOpen(false)}>
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </Modal>
  );
}

function Settings({ onClose }: { onClose: () => void }) {
  const { data, lockEnabled, setLockEnabled, deleteRecurrence, exportBackup, importBackup } = useData();

  const describe = (r: RecurrenceRule) => {
    const t = r.template;
    const label = t.type === 'transfer'
      ? `Virement ${data.accounts.find((a) => a.id === t.fromAccountId)?.name ?? '?'} → ${data.accounts.find((a) => a.id === t.toAccountId)?.name ?? '?'}`
      : (data.categories.find((c) => c.id === t.categoryId)?.name ?? '?');
    return { label, sub: `${formatAmount(t.amount)} ${FREQ[r.frequency]} · depuis le ${shortDate(r.startDate)}` };
  };

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

  const confirmDeleteRule = (r: RecurrenceRule) =>
    Alert.alert('Arrêter cette planification ?', 'Les transactions déjà créées sont conservées.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Arrêter', style: 'destructive', onPress: () => deleteRecurrence(r.id) },
    ]);

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
      <View style={rowStyle}>
        <Txt bold size={20}>Réglages</Txt>
        <Button title="Fermer" variant="ghost" onPress={onClose} />
      </View>

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

      <SectionTitle>Planifications</SectionTitle>
      {data.recurrences.length === 0 ? <Empty>Aucune transaction répétée.</Empty> : (
        <Card style={{ paddingVertical: 4 }}>
          {data.recurrences.map((r) => {
            const { label, sub } = describe(r);
            return (
              <View key={r.id} style={rowStyle}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Txt>{label}</Txt>
                  <Txt sub size={13}>{sub}</Txt>
                </View>
                <Button title="Arrêter" variant="danger" onPress={() => confirmDeleteRule(r)} />
              </View>
            );
          })}
        </Card>
      )}

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
