import { Router, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authenticate';

const router = Router();

router.get('/overview', async (req: AuthRequest, res: Response) => {
  const children = await prisma.childProfile.findMany({
    where: { parentId: req.userId },
    select: { id: true },
  });
  const childIds = children.map((c) => c.id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalChildren, totalDevices, todayScreenTime, unreadAlerts] = await Promise.all([
    prisma.childProfile.count({ where: { parentId: req.userId } }),
    prisma.device.count({ where: { childProfileId: { in: childIds }, isActive: true } }),
    prisma.screenTimeRecord.aggregate({
      where: { childProfileId: { in: childIds }, date: { gte: today } },
      _sum: { totalMinutes: true },
    }),
    prisma.alert.count({ where: { childProfileId: { in: childIds }, isResolved: false } }),
  ]);

  res.json({
    totalChildren,
    totalDevices,
    todayScreenTimeMinutes: todayScreenTime._sum.totalMinutes ?? 0,
    unreadAlerts,
  });
});

router.get('/screen-time-summary/:childId',
  param('childId').isUUID(),
  query('period').optional().isIn(['week', 'month']),
  async (req: AuthRequest, res: Response) => {
    const child = await prisma.childProfile.findFirst({
      where: { id: req.params.childId, parentId: req.userId },
    });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const period = (req.query.period as string) || 'week';
    const days = period === 'month' ? 30 : 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const records = await prisma.screenTimeRecord.findMany({
      where: { childProfileId: req.params.childId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    const totalMinutes = records.reduce((sum, r) => sum + r.totalMinutes, 0);
    const avgMinutes = records.length ? Math.round(totalMinutes / records.length) : 0;
    const maxMinutes = records.length ? Math.max(...records.map((r) => r.totalMinutes)) : 0;

    res.json({ records, totalMinutes, avgMinutes, maxMinutes, dailyLimit: child.dailyScreenLimit });
  }
);

router.get('/top-apps/:childId',
  param('childId').isUUID(),
  query('days').optional().isInt({ min: 1, max: 30 }),
  async (req: AuthRequest, res: Response) => {
    const child = await prisma.childProfile.findFirst({
      where: { id: req.params.childId, parentId: req.userId },
    });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const days = parseInt(req.query.days as string) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const usage = await prisma.appUsage.groupBy({
      by: ['packageName', 'appName'],
      where: { childProfileId: req.params.childId, date: { gte: since } },
      _sum: { usageMinutes: true },
      orderBy: { _sum: { usageMinutes: 'desc' } },
      take: 10,
    });

    res.json(usage.map((u) => ({
      packageName: u.packageName,
      appName: u.appName,
      totalMinutes: u._sum.usageMinutes ?? 0,
    })));
  }
);

export default router;
