import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authenticate';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  const children = await prisma.childProfile.findMany({
    where: { parentId: req.userId },
    select: { id: true },
  });
  const childIds = children.map((c) => c.id);

  const devices = await prisma.device.findMany({
    where: { childProfileId: { in: childIds } },
    include: { childProfile: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(devices);
});

router.post('/generate-pairing-code',
  body('childProfileId').isUUID(),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const child = await prisma.childProfile.findFirst({
      where: { id: req.body.childProfileId, parentId: req.userId },
    });
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    const pairingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await prisma.childProfile.update({
      where: { id: child.id },
      data: {},
    });

    const tempDevice = await prisma.device.create({
      data: {
        childProfileId: child.id,
        deviceName: 'Pending',
        pairingCode,
        isActive: false,
      },
    });

    res.json({ pairingCode, deviceId: tempDevice.id });
  }
);


router.put('/:id/fcm-token',
  param('id').isUUID(),
  body('fcmToken').notEmpty(),
  async (req: AuthRequest, res: Response) => {
    const device = await prisma.device.update({
      where: { id: req.params.id },
      data: { fcmToken: req.body.fcmToken, lastSeen: new Date() },
    });
    res.json(device);
  }
);

router.delete('/:id',
  param('id').isUUID(),
  async (req: AuthRequest, res: Response) => {
    const children = await prisma.childProfile.findMany({
      where: { parentId: req.userId },
      select: { id: true },
    });
    const childIds = children.map((c) => c.id);

    const device = await prisma.device.findFirst({
      where: { id: req.params.id, childProfileId: { in: childIds } },
    });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    await prisma.device.delete({ where: { id: req.params.id } });
    res.json({ message: 'Device removed' });
  }
);

export default router;
