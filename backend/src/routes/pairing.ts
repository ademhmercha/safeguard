import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { supabase } from '../utils/supabase';

const router = Router();

router.post('/pair',
  body('pairingCode').notEmpty(),
  body('deviceName').trim().notEmpty(),
  body('deviceModel').optional().trim(),
  body('osVersion').optional().trim(),
  body('fcmToken').optional().trim(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const device = await prisma.device.findUnique({
      where: { pairingCode: req.body.pairingCode },
    });
    if (!device) return res.status(404).json({ error: 'Invalid pairing code' });

    const updated = await prisma.device.update({
      where: { id: device.id },
      data: {
        deviceName: req.body.deviceName,
        deviceModel: req.body.deviceModel,
        osVersion: req.body.osVersion,
        fcmToken: req.body.fcmToken,
        isActive: true,
        pairingCode: null,
        lastSeen: new Date(),
      },
    });
    res.json(updated);
  }
);

// Returns lock state + daily screen limit (no auth — device calls this on startup)
router.get('/:id/status',
  param('id').isUUID(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      select: {
        isLocked: true,
        childProfile: { select: { dailyScreenLimit: true } },
      },
    });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    res.json({
      isLocked: device.isLocked,
      dailyScreenLimit: device.childProfile.dailyScreenLimit,
    });
  }
);

// Returns undelivered commands and marks them as DELIVERED (no auth — device calls on startup)
router.get('/:id/pending-commands',
  param('id').isUUID(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const commands = await prisma.deviceCommand.findMany({
      where: { deviceId: req.params.id, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    if (commands.length > 0) {
      await prisma.deviceCommand.updateMany({
        where: { id: { in: commands.map((c) => c.id) } },
        data: { status: 'DELIVERED' },
      });
    }

    res.json(commands);
  }
);

// Auto-lock when screen time exceeds daily limit (no auth — background task calls this)
router.post('/:id/screen-time-lock',
  param('id').isUUID(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: { childProfile: { select: { id: true, dailyScreenLimit: true } } },
    });
    if (!device || device.isLocked) return res.json({ locked: device?.isLocked ?? false });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await prisma.screenTimeRecord.findUnique({
      where: {
        childProfileId_date: {
          childProfileId: device.childProfile.id,
          date: today,
        },
      },
    });

    if (!record || record.totalMinutes < device.childProfile.dailyScreenLimit) {
      return res.json({ locked: false });
    }

    await prisma.device.update({ where: { id: device.id }, data: { isLocked: true } });

    const dbCommand = await prisma.deviceCommand.create({
      data: { deviceId: device.id, command: 'LOCK_DEVICE', payload: {}, status: 'PENDING' },
    });

    await supabase.channel(`device:${device.id}`).send({
      type: 'broadcast',
      event: 'command',
      payload: { commandId: dbCommand.id, command: 'LOCK_DEVICE', payload: {} },
    });

    res.json({ locked: true });
  }
);

export default router;
