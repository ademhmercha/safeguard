import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authenticate';
import { notificationService } from '../services/notificationService';

const router = Router();

router.post('/screen-time',
  body('childProfileId').isUUID(),
  body('totalMinutes').isInt({ min: 0 }),
  body('date').isISO8601(),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const child = await prisma.childProfile.findFirst({
      where: { id: req.body.childProfileId },
      include: { parent: true },
    });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const record = await prisma.screenTimeRecord.upsert({
      where: { childProfileId_date: { childProfileId: req.body.childProfileId, date: new Date(req.body.date) } },
      update: { totalMinutes: req.body.totalMinutes },
      create: {
        childProfileId: req.body.childProfileId,
        totalMinutes: req.body.totalMinutes,
        date: new Date(req.body.date),
      },
    });

    if (req.body.totalMinutes >= child.dailyScreenLimit) {
      await notificationService.sendScreenTimeLimitAlert(child.parent.id, child.name, req.body.totalMinutes);
    }

    res.json(record);
  }
);

router.post('/app-usage',
  body('childProfileId').isUUID(),
  body('appName').trim().notEmpty(),
  body('packageName').trim().notEmpty(),
  body('usageMinutes').isInt({ min: 0 }),
  body('date').isISO8601(),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const record = await prisma.appUsage.upsert({
      where: {
        childProfileId_packageName_date: {
          childProfileId: req.body.childProfileId,
          packageName: req.body.packageName,
          date: new Date(req.body.date),
        },
      },
      update: { usageMinutes: req.body.usageMinutes },
      create: {
        childProfileId: req.body.childProfileId,
        appName: req.body.appName,
        packageName: req.body.packageName,
        usageMinutes: req.body.usageMinutes,
        date: new Date(req.body.date),
      },
    });
    res.json(record);
  }
);

router.get('/screen-time/:childId',
  param('childId').isUUID(),
  query('days').optional().isInt({ min: 1, max: 90 }),
  async (req: AuthRequest, res: Response) => {
    const days = parseInt(req.query.days as string) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const records = await prisma.screenTimeRecord.findMany({
      where: { childProfileId: req.params.childId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });
    res.json(records);
  }
);

router.get('/app-usage/:childId',
  param('childId').isUUID(),
  query('days').optional().isInt({ min: 1, max: 30 }),
  async (req: AuthRequest, res: Response) => {
    const days = parseInt(req.query.days as string) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const records = await prisma.appUsage.findMany({
      where: { childProfileId: req.params.childId, date: { gte: since } },
      orderBy: [{ date: 'desc' }, { usageMinutes: 'desc' }],
    });
    res.json(records);
  }
);

router.get('/alerts/:childId',
  param('childId').isUUID(),
  async (req: AuthRequest, res: Response) => {
    const alerts = await prisma.alert.findMany({
      where: { childProfileId: req.params.childId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(alerts);
  }
);

export default router;
