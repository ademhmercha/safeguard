import { requireNativeModule } from 'expo-modules-core';

interface ForegroundServiceModule {
  start(title: string, text: string): Promise<void>;
  stop(): Promise<void>;
}

export default requireNativeModule<ForegroundServiceModule>('ForegroundService');
