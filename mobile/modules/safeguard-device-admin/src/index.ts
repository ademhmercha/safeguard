import { requireNativeModule } from 'expo-modules-core';

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

const getNativeModule = (): DeviceAdminModule => {
  try {
    return requireNativeModule<DeviceAdminModule>('DeviceAdmin');
  } catch {
    return fallback;
  }
};

export default getNativeModule();
