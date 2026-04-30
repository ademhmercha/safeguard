import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { flushAllPending, onAppBackground } from './activityTracker';

const TASK_NAME = 'safeguard-background-sync';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const deviceId = await AsyncStorage.getItem('deviceId');
    const childProfileId = await AsyncStorage.getItem('childProfileId');
    if (!deviceId || !childProfileId) return BackgroundFetch.BackgroundFetchResult.NoData;

    // Flush any pending browser visits / search terms
    await onAppBackground();
    await flushAllPending();

    const screenMinutes = await getScreenTimeMinutes();
    const today = new Date().toISOString().split('T')[0];

    await api.post('/monitoring/screen-time', {
      childProfileId,
      totalMinutes: screenMinutes,
      date: today,
    });

    const pendingCommands = await api.get(`/control/policies/${childProfileId}`);
    await AsyncStorage.setItem('activePolicies', JSON.stringify(pendingCommands.data));

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

async function getScreenTimeMinutes(): Promise<number> {
  const stored = await AsyncStorage.getItem('sessionStartTime');
  if (!stored) return 0;
  const startTime = parseInt(stored);
  const now = Date.now();
  return Math.floor((now - startTime) / 60_000);
}

export async function registerBackgroundSync() {
  const status = await BackgroundFetch.getStatusAsync();
  if (status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied) return;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}

export async function reportAppUsage(childProfileId: string, appName: string, packageName: string, minutes: number) {
  const today = new Date().toISOString().split('T')[0];
  await api.post('/monitoring/app-usage', {
    childProfileId, appName, packageName, usageMinutes: minutes, date: today,
  });
}
