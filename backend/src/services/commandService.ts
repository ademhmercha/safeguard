import { prisma } from '../utils/prisma';
import { supabase } from '../utils/supabase';
import { notificationService } from './notificationService';
import { logger } from '../utils/logger';
import { Prisma } from '@prisma/client';

type CommandType = 'LOCK_DEVICE' | 'UNLOCK_DEVICE' | 'BLOCK_APP' | 'UNBLOCK_APP' | 'UPDATE_LIMITS' | 'SYNC_POLICIES';

export const commandService = {
  async sendCommand(deviceId: string, command: CommandType, payload?: Record<string, unknown>) {
    const dbCommand = await prisma.deviceCommand.create({
      data: {
        deviceId,
        command,
        payload: (payload ?? {}) as Prisma.InputJsonValue,
        status: 'PENDING',
      },
    });

    const response = await supabase
      .channel(`device:${deviceId}`)
      .send({
        type: 'broadcast',
        event: 'command',
        payload: { commandId: dbCommand.id, command, payload },
      });

    if (response !== 'ok') {
      logger.warn('Realtime send failed, relying on FCM', { deviceId, response });
      await notificationService.sendPushToDevice(deviceId, 'New command', command, {
        commandId: dbCommand.id,
        command,
      });
    }

    return dbCommand;
  },

  async markExecuted(commandId: string) {
    return prisma.deviceCommand.update({
      where: { id: commandId },
      data: { status: 'EXECUTED', executedAt: new Date() },
    });
  },
};
