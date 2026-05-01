import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import UsageStats from 'safeguard-usage-stats';

// Reports real per-app usage from Android UsageStatsManager to the backend.
export async function reportUsageStats(): Promise<void> {
  try {
    const hasPermission = await UsageStats.hasPermission();
    if (!hasPermission) return;

    const childProfileId = await AsyncStorage.getItem('childProfileId');
    if (!childProfileId) return;

    const endMs = Date.now();
    const startMs = endMs - 24 * 60 * 60 * 1000;
    const today = new Date().toISOString().split('T')[0];

    const stats = await UsageStats.getStats(startMs, endMs);

    for (const stat of stats) {
      const usageMinutes = Math.floor(stat.usageMs / 60_000);
      if (usageMinutes < 1) continue;
      await api.post('/monitoring/app-usage', {
        childProfileId,
        appName: stat.appName,
        packageName: stat.packageName,
        usageMinutes,
        date: today,
      }).catch(() => null);
    }
  } catch {
    // Module not available or permission denied
  }
}
