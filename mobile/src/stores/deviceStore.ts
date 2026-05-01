import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';

interface DeviceState {
  deviceId: string | null;
  childProfileId: string | null;
  isLocked: boolean;
  isPaired: boolean;
  setDevice: (deviceId: string, childProfileId: string) => Promise<void>;
  loadFromStorage: () => Promise<void>;
  setLocked: (locked: boolean) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  deviceId: null,
  childProfileId: null,
  isLocked: false,
  isPaired: false,

  setDevice: async (deviceId, childProfileId) => {
    await AsyncStorage.multiSet([
      ['deviceId', deviceId],
      ['childProfileId', childProfileId],
      ['deviceLocked', 'false'],
    ]);
    set({ deviceId, childProfileId, isPaired: true, isLocked: false });
  },

  loadFromStorage: async () => {
    const [[, deviceId], [, childProfileId], [, locked]] = await AsyncStorage.multiGet([
      'deviceId', 'childProfileId', 'deviceLocked',
    ]);
    set({
      deviceId,
      childProfileId,
      isPaired: !!deviceId,
      isLocked: locked === 'true',
    });

    if (deviceId) {
      try {
        const { data } = await api.get(`/devices/${deviceId}/status`);
        set({ isLocked: data.isLocked });
        await AsyncStorage.setItem('deviceLocked', String(data.isLocked));
      } catch {
        // server unreachable — keep AsyncStorage value
      }
    }
  },

  setLocked: (locked) => set({ isLocked: locked }),
}));
