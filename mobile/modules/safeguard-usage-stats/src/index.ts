import { requireNativeModule } from 'expo-modules-core';

export interface AppUsageStat {
  packageName: string;
  appName: string;
  usageMs: number;
}

interface UsageStatsModule {
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<void>;
  getStats(startMs: number, endMs: number): Promise<AppUsageStat[]>;
}

export default requireNativeModule<UsageStatsModule>('UsageStats');
