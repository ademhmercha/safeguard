import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useDeviceStore } from '../src/stores/deviceStore';
import { pollPendingCommands } from '../src/services/commandPoller';
import ForegroundService from 'safeguard-foreground-service';

export default function RootLayout() {
  const { loadFromStorage, isPaired } = useDeviceStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (!isPaired) return;

    // Start persistent foreground service so Android doesn't kill monitoring
    ForegroundService.start('SafeGuard', 'Monitoring active').catch(() => null);

    // Execute any commands that arrived while the device was offline
    pollPendingCommands().catch(() => null);
  }, [isPaired]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
