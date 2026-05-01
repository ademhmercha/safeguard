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

const fallback: UsageStatsModule = {
  hasPermission: async () => false,
  requestPermission: async () => {},
  getStats: async () => [],
};

const getNativeModule = (): UsageStatsModule => {
  try {
    return requireNativeModule<UsageStatsModule>('UsageStats');
  } catch {
    return fallback;
  }
};

export default getNativeModule();
