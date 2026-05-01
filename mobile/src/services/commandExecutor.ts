import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { api } from '../lib/api';
import DeviceAdmin from 'safeguard-device-admin';

async function lockDevice() {
  await AsyncStorage.setItem('deviceLocked', 'true');
  try {
    const isAdmin = await DeviceAdmin.isAdminActive();
    if (isAdmin) {
      await DeviceAdmin.lockDevice();
    }
  } catch {
    // Native module unavailable or admin not granted — UI lock still active via store
  }
}

export async function executeCommand(
  commandId: string,
  command: string,
  payload?: Record<string, string>
) {
  switch (command) {
    case 'LOCK_DEVICE':
      await lockDevice();
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
