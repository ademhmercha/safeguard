import { NativeModules } from 'react-native';

interface ForegroundServiceModule {
  start(title: string, text: string): Promise<void>;
  stop(): Promise<void>;
}

const fallback: ForegroundServiceModule = {
  start: async () => {},
  stop: async () => {},
};

export default (NativeModules.ForegroundService as ForegroundServiceModule) ?? fallback;
