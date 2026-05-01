import { requireNativeModule } from 'expo-modules-core';

interface DeviceAdminModule {
  isAdminActive(): Promise<boolean>;
  lockDevice(): Promise<void>;
  requestAdmin(): Promise<void>;
}

export default requireNativeModule<DeviceAdminModule>('DeviceAdmin');
