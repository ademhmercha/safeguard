import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  AppState, AppStateStatus, TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDeviceStore } from '../stores/deviceStore';
import { setupNotificationListeners } from '../services/notificationService';
import { executeCommand } from '../services/commandExecutor';
import { reportAppUsage } from '../services/trackingService';
import { setupAppStateTracking, flushAllPending } from '../services/activityTracker';
import { supabase } from '../lib/supabase';
import MonitoredWebView from '../components/MonitoredWebView';
import { api } from '../lib/api';

function minutesToHours(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export default function HomeScreen() {
  const { isLocked, setLocked, deviceId, childProfileId } = useDeviceStore();
  const sessionStartRef = useRef(Date.now());
  const appState = useRef(AppState.currentState);
  const [browserOpen, setBrowserOpen] = useState(false);

  useEffect(() => {
    const cleanupNotif = setupNotificationListeners(async (data) => {
      setLocked(data.command === 'LOCK_DEVICE');
      await executeCommand(data.commandId, data.command, data as unknown as Record<string, string>);
    });

    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    if (deviceId) {
      realtimeChannel = supabase.channel(`device:${deviceId}`);
      realtimeChannel
        .on('broadcast', { event: 'command' }, async ({ payload }) => {
          const { commandId, command, payload: cmdPayload } = payload as {
            commandId: string;
            command: string;
            payload: Record<string, string>;
          };
          setLocked(command === 'LOCK_DEVICE');
          await executeCommand(commandId, command, cmdPayload ?? {});
        })
        .subscribe();
    }

    // App session + flush tracking
    const cleanupTracking = setupAppStateTracking(() => ({
      appName: 'SafeGuard',
      packageName: 'com.safeguard.child',
    }));

    const subscription = AppState.addEventListener('change', async (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        sessionStartRef.current = Date.now();
      }

      if (next.match(/inactive|background/) && childProfileId) {
        const mins = Math.floor((Date.now() - sessionStartRef.current) / 60_000);
        if (mins > 0) {
          const today = new Date().toISOString().split('T')[0];
          await Promise.allSettled([
            reportAppUsage(childProfileId, 'SafeGuard', 'com.safeguard.child', mins),
            api.post('/monitoring/screen-time', { childProfileId, totalMinutes: mins, date: today }),
          ]);
        }
        await flushAllPending().catch(() => null);
        await AsyncStorage.setItem('sessionStartTime', String(Date.now()));
      }

      appState.current = next;
    });

    return () => {
      cleanupNotif();
      cleanupTracking();
      subscription.remove();
      realtimeChannel?.unsubscribe();
    };
  }, [childProfileId, setLocked]);

  if (isLocked) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.lockedTitle}>Device Locked</Text>
        <Text style={styles.lockedSubtitle}>Your parent has locked this device. Please see them to unlock it.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>SafeGuard</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Protected</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Device Status</Text>
        <View style={styles.statusRow}>
          <View style={styles.dot} />
          <Text style={styles.statusLabel}>Monitoring active</Text>
        </View>
        <View style={styles.statusRow}>
          <View style={styles.dot} />
          <Text style={styles.statusLabel}>Connected to SafeGuard</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Info</Text>
        <Text style={styles.infoText}>Your screen time and app usage is being tracked and shared with your parent to keep you safe online.</Text>
      </View>

      <TouchableOpacity style={styles.browserButton} onPress={() => setBrowserOpen(true)}>
        <Text style={styles.browserButtonText}>Open Browser</Text>
      </TouchableOpacity>

      <Modal visible={browserOpen} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <MonitoredWebView onClose={() => setBrowserOpen(false)} />
          <TouchableOpacity style={styles.closeButton} onPress={async () => { await flushAllPending(); setBrowserOpen(false); }}>
            <Text style={styles.closeButtonText}>Close Browser</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e40af' },
  statusBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText: { color: '#16a34a', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 10 },
  statusLabel: { fontSize: 14, color: '#475569' },
  infoText: { fontSize: 14, color: '#64748b', lineHeight: 22 },
  lockedContainer: { flex: 1, backgroundColor: '#1e3a8a', justifyContent: 'center', alignItems: 'center', padding: 40 },
  lockIcon: { fontSize: 64, marginBottom: 24 },
  lockedTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 12, textAlign: 'center' },
  lockedSubtitle: { fontSize: 16, color: '#93c5fd', textAlign: 'center', lineHeight: 24 },
  browserButton: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  browserButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  closeButton: { backgroundColor: '#ef4444', padding: 16, alignItems: 'center' },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
