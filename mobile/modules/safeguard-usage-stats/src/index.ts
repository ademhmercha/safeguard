import { NativeModules } from 'react-native';

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

export default (NativeModules.UsageStats as UsageStatsModule) ?? fallback;
