import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authenticate';
import { commandService } from '../services/commandService';

const router = Router();

router.post('/lock/:deviceId',
  param('deviceId').isUUID(),
  async (req: AuthRequest, res: Response) => {
    const device = await getDeviceForParent(req.params.deviceId, req.userId!);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const command = await commandService.sendCommand(device.id, 'LOCK_DEVICE');
    await prisma.device.update({ where: { id: device.id }, data: { isLocked: true } });
    res.json({ message: 'Lock command sent', command });
  }
);

router.post('/unlock/:deviceId',
  param('deviceId').isUUID(),
  async (req: AuthRequest, res: Response) => {
    const device = await getDeviceForParent(req.params.deviceId, req.userId!);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const command = await commandService.sendCommand(device.id, 'UNLOCK_DEVICE');
    await prisma.device.update({ where: { id: device.id }, data: { isLocked: false } });
    res.json({ message: 'Unlock command sent', command });
  }
);

router.post('/block-app',
  body('childProfileId').isUUID(),
  body('packageName').trim().notEmpty(),
  body('appName').trim().notEmpty(),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const child = await prisma.childProfile.findFirst({
      where: { id: req.body.childProfileId, parentId: req.userId },
      include: { devices: { where: { isActive: true } } },
    });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const policy = await prisma.restrictionPolicy.create({
      data: {
        childProfileId: req.body.childProfileId,
        policyType: 'APP_BLOCK',
        packageName: req.body.packageName,
        appName: req.body.appName,
        isBlocked: true,
      },
    });

    for (const device of child.devices) {
      await commandService.sendCommand(device.id, 'BLOCK_APP', {
        packageName: req.body.packageName,
      });
    }

    res.status(201).json(policy);
  }
);

router.delete('/block-app/:policyId',
  param('policyId').isUUID(),
  async (req: AuthRequest, res: Response) => {
    const policy = await prisma.restrictionPolicy.findFirst({
      where: {
        id: req.params.policyId,
        childProfile: { parentId: req.userId },
      },
      include: { childProfile: { include: { devices: { where: { isActive: true } } } } },
    });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });

    await prisma.restrictionPolicy.delete({ where: { id: policy.id } });

    for (const device of policy.childProfile.devices) {
      await commandService.sendCommand(device.id, 'UNBLOCK_APP', {
        packageName: policy.packageName ?? '',
      });
    }

    res.json({ message: 'App unblocked' });
  }
);

router.post('/schedule',
  body('childProfileId').isUUID(),
  body('scheduleStart').matches(/^\d{2}:\d{2}$/),
  body('scheduleEnd').matches(/^\d{2}:\d{2}$/),
  body('daysOfWeek').isArray(),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const child = await prisma.childProfile.findFirst({
      where: { id: req.body.childProfileId, parentId: req.userId },
    });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const policy = await prisma.restrictionPolicy.create({
      data: {
        childProfileId: req.body.childProfileId,
        policyType: 'SCHEDULE',
        scheduleStart: req.body.scheduleStart,
        scheduleEnd: req.body.scheduleEnd,
        daysOfWeek: req.body.daysOfWeek,
        isBlocked: true,
      },
    });
    res.status(201).json(policy);
  }
);

router.post('/block-website',
  body('childProfileId').isUUID(),
  body('domain').trim().notEmpty(),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const child = await prisma.childProfile.findFirst({
      where: { id: req.body.childProfileId, parentId: req.userId },
    });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const domain = req.body.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

    const policy = await prisma.restrictionPolicy.create({
      data: {
        childProfileId: req.body.childProfileId,
        policyType: 'CONTENT_FILTER',
        packageName: domain,
        appName: domain,
        isBlocked: true,
      },
    });
    res.status(201).json(policy);
  }
);

router.delete('/block-website/:policyId',
  param('policyId').isUUID(),
  async (req: AuthRequest, res: Response) => {
    const policy = await prisma.restrictionPolicy.findFirst({
      where: { id: req.params.policyId, childProfile: { parentId: req.userId } },
    });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    await prisma.restrictionPolicy.delete({ where: { id: policy.id } });
    res.json({ message: 'Website unblocked' });
  }
);

router.get('/policies/:childId',
  param('childId').isUUID(),
  async (req: AuthRequest, res: Response) => {
    const child = await prisma.childProfile.findFirst({
      where: { id: req.params.childId, parentId: req.userId },
    });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const policies = await prisma.restrictionPolicy.findMany({
      where: { childProfileId: req.params.childId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(policies);
  }
);

async function getDeviceForParent(deviceId: string, parentId: string) {
  const children = await prisma.childProfile.findMany({
    where: { parentId },
    select: { id: true },
  });
  const childIds = children.map((c) => c.id);
  return prisma.device.findFirst({
    where: { id: deviceId, childProfileId: { in: childIds } },
  });
}

export default router;
