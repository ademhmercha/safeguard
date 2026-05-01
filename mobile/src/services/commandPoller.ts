import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { executeCommand } from './commandExecutor';

// Fetches PENDING commands from server and executes them.
// Called on app startup and in the background sync task to handle offline-delivered commands.
export async function pollPendingCommands(): Promise<void> {
  const deviceId = await AsyncStorage.getItem('deviceId');
  if (!deviceId) return;

  try {
    const { data: commands } = await api.get(`/devices/${deviceId}/pending-commands`);
    if (!Array.isArray(commands) || commands.length === 0) return;

    for (const cmd of commands) {
      await executeCommand(cmd.id, cmd.command, (cmd.payload as Record<string, string>) ?? {});
    }
  } catch {
    // Network unavailable — commands will be picked up on next startup
  }
}
