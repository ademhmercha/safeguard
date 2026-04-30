import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';
import { api } from '../lib/api';

export async function executeCommand(commandId: string, command: string, payload?: Record<string, string>) {
  switch (command) {
    case 'LOCK_DEVICE':
      await AsyncStorage.setItem('deviceLocked', 'true');
      Alert.alert('Device Locked', 'Your device has been locked by your parent.');
      break;

    case 'UNLOCK_DEVICE':
      await AsyncStorage.setItem('deviceLocked', 'false');
      break;

    case 'BLOCK_APP': {
      const blockedApps = JSON.parse(await AsyncStorage.getItem('blockedApps') || '[]');
      if (payload?.packageName && !blockedApps.includes(payload.packageName)) {
        blockedApps.push(payload.packageName);
        await AsyncStorage.setItem('blockedApps', JSON.stringify(blockedApps));
      }
      break;
    }

    case 'UNBLOCK_APP': {
      const blockedApps = JSON.parse(await AsyncStorage.getItem('blockedApps') || '[]');
      const filtered = blockedApps.filter((p: string) => p !== payload?.packageName);
      await AsyncStorage.setItem('blockedApps', JSON.stringify(filtered));
      break;
    }

    case 'SYNC_POLICIES':
      break;

    default:
      console.warn('Unknown command:', command);
  }

  await api.post('/monitoring/command-executed', { commandId }).catch(() => null);
}
