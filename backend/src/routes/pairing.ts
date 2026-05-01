import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';

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

router.get('/:id/status',
  param('id').isUUID(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      select: { isLocked: true },
    });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json({ isLocked: device.isLocked });
  }
);

export default router;
