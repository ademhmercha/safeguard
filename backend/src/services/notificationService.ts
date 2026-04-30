import { prisma } from '../utils/prisma';
import { sendPushNotification } from '../utils/firebase';
import { logger } from '../utils/logger';

export const notificationService = {
  async sendScreenTimeLimitAlert(parentId: string, childName: string, minutes: number) {
    await prisma.notification.create({
      data: {
        userId: parentId,
        title: 'Screen time limit reached',
        body: `${childName} has used ${minutes} minutes of screen time today.`,
        type: 'SCREEN_TIME_LIMIT',
        metadata: { childName, minutes },
      },
    });
  },

  async sendDeviceLockedNotification(parentId: string, childName: string) {
    await prisma.notification.create({
      data: {
        userId: parentId,
        title: 'Device locked',
        body: `${childName}'s device has been locked.`,
        type: 'DEVICE_LOCKED',
      },
    });
  },

  async sendPushToDevice(deviceId: string, title: string, body: string, data?: Record<string, string>) {
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device?.fcmToken) return;
    try {
      await sendPushNotification(device.fcmToken, title, body, data);
    } catch (err) {
      logger.warn('Failed to send push notification', { deviceId, err });
    }
  },
};
