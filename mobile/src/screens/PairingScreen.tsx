import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Device from 'expo-device';
import { api } from '../lib/api';
import { useDeviceStore } from '../stores/deviceStore';
import { registerBackgroundSync } from '../services/trackingService';
import { registerForPushNotifications } from '../services/notificationService';

export default function PairingScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { setDevice } = useDeviceStore();

  async function handlePair() {
    if (code.length !== 6) {
      Alert.alert('Invalid code', 'Please enter a 6-character pairing code.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/devices/pair', {
        pairingCode: code.toUpperCase(),
        deviceName: Device.deviceName || 'Child Device',
        deviceModel: Device.modelName || undefined,
        osVersion: Device.osVersion || undefined,
      });

      await setDevice(data.id, data.childProfileId);
      await registerBackgroundSync();
      await registerForPushNotifications(data.id);
    } catch (err) {
      Alert.alert('Pairing failed', 'Invalid code or device already paired. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.title}>SafeGuard</Text>
        <Text style={styles.subtitle}>Enter the pairing code from the parent app</Text>

        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          textAlign="center"
          letterSpacing={8}
        />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handlePair} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Pair device</Text>}
        </TouchableOpacity>

        <Text style={styles.hint}>Ask your parent to generate a pairing code in the SafeGuard dashboard.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eff6ff' },
  content: { flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1e40af', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 40 },
  input: {
    width: '100%', height: 60, borderWidth: 2, borderColor: '#2563eb',
    borderRadius: 12, fontSize: 28, fontWeight: 'bold', color: '#1e40af',
    backgroundColor: '#fff', marginBottom: 20,
  },
  button: {
    width: '100%', height: 52, backgroundColor: '#2563eb',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
