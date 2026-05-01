import { requireNativeModule } from 'expo-modules-core';

interface ForegroundServiceModule {
  start(title: string, text: string): Promise<void>;
  stop(): Promise<void>;
}

const noop = async (..._args: unknown[]) => {};
const fallback: ForegroundServiceModule = { start: noop, stop: noop };

const getNativeModule = (): ForegroundServiceModule => {
  try {
    return requireNativeModule<ForegroundServiceModule>('ForegroundService');
  } catch {
    return fallback;
  }
};

export default getNativeModule();
