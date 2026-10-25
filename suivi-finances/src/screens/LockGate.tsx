import * as LocalAuthentication from 'expo-local-authentication';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useData } from '../state/DataContext';
import { Button, Txt } from '../ui/components';
import { useTheme } from '../ui/theme';

/** Recouvre l'app tant que l'utilisateur ne s'est pas authentifié (si le verrouillage est activé). */
export function LockGate() {
  const { ready, lockEnabled } = useData();
  const t = useTheme();
  const [locked, setLocked] = useState(true);
  const busy = useRef(false);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      // Sans code ni biométrie sur l'iPhone, on ne bloque pas l'utilisateur hors de ses données.
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level === LocalAuthentication.SecurityLevel.NONE) return setLocked(false);
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Déverrouiller Mes Finances' });
      if (res.success) setLocked(false);
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (ready && lockEnabled) unlock();
  }, [ready, lockEnabled, unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' && lockEnabled) setLocked(true);
      if (s === 'active' && lockEnabled) unlock();
    });
    return () => sub.remove();
  }, [lockEnabled, unlock]);

  if (!ready || !lockEnabled || !locked) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: t.bg }]}>
      <Txt bold size={22}>Mes Finances</Txt>
      <Txt sub style={{ marginBottom: 16 }}>Verrouillé</Txt>
      <Button title="Déverrouiller" onPress={unlock} />
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center', zIndex: 10 } });
