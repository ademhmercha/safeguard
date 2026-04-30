import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useDeviceStore } from '../src/stores/deviceStore';

export default function RootLayout() {
  const { loadFromStorage } = useDeviceStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
