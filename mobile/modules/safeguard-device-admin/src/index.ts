import { NativeModules } from 'react-native';

interface DeviceAdminModule {
  isAdminActive(): Promise<boolean>;
  lockDevice(): Promise<void>;
  requestAdmin(): Promise<void>;
}

const fallback: DeviceAdminModule = {
  isAdminActive: async () => false,
  lockDevice: async () => {},
  requestAdmin: async () => {},
};

export default (NativeModules.DeviceAdmin as DeviceAdminModule) ?? fallback;
