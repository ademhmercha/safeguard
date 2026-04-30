import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authenticate';
import { notificationService } from '../services/notificationService';

const router = Router();

// ── App Sessions ─────────────────────────────────────────────────────────────

router.post('/app-session',
  body('childProfileId').isUUID(),
  body('appName').trim().notEmpty(),
  body('packageName').trim().notEmpty(),
  body('startedAt').isISO8601(),
  body('endedAt').optional().isISO8601(),
  body('durationSecs').optional().isInt({ min: 0 }),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const session = await prisma.appSession.create({
      data: {
        childProfileId: req.body.childProfileId,
        appName: req.body.appName,
        packageName: req.body.packageName,
        startedAt: new Date(req.body.startedAt),
        endedAt: req.body.endedAt ? new Date(req.body.endedAt) : undefined,
        durationSecs: req.body.durationSecs,
      },
    });
    res.status(201).json(session);
  }
);

router.get('/app-sessions/:childId',
  param('childId').isUUID(),
  query('date').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  async (req: AuthRequest, res: Response) => {
    const child = await prisma.childProfile.findFirst({
      where: { id: req.params.childId, parentId: req.userId },
    });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const limit = parseInt(req.query.limit as string) || 100;
    const dateFilter = req.query.date
      ? { gte: new Date(req.query.date as string), lt: new Date(new Date(req.query.date as string).getTime() + 86_400_000) }
      : undefined;

    const sessions = await prisma.appSession.findMany({
      where: { childProfileId: req.params.childId, ...(dateFilter ? { startedAt: dateFilter } : {}) },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    res.json(sessions);
  }
);

// ── Browser History ───────────────────────────────────────────────────────────

router.post('/browser-visit',
  body('childProfileId').isUUID(),
  body('url').isURL({ require_protocol: true }),
  body('domain').trim().notEmpty(),
  body('title').optional().trim(),
  body('visitedAt').isISO8601(),
  body('browserApp').optional().trim(),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const child = await prisma.childProfile.findFirst({
      where: { id: req.body.childProfileId },
      include: {
        parent: true,
        restrictionPolicies: { where: { policyType: 'CONTENT_FILTER', isBlocked: true } },
      },
    });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    // Check if domain is blocked
    const isBlocked = child.restrictionPolicies.some(
      (p) => p.packageName === req.body.domain || req.body.url.includes(p.packageName ?? '')
    );

    const visit = await prisma.browserHistory.create({
      data: {
        childProfileId: req.body.childProfileId,
        url: req.body.url,
        title: req.body.title,
        domain: req.body.domain,
        visitedAt: new Date(req.body.visitedAt),
        browserApp: req.body.browserApp,
        isBlocked,
      },
    });

    if (isBlocked) {
      await prisma.alert.create({
        data: {
          childProfileId: req.body.childProfileId,
          alertType: 'BLOCKED_SITE_ATTEMPT',
          message: `${child.name} tried to visit blocked site: ${req.body.domain}`,
          metadata: { url: req.body.url, domain: req.body.domain },
        },
      });
      await notificationService.sendScreenTimeLimitAlert(
        child.parent.id,
        `${child.name} tried to visit blocked site: ${req.body.domain}`,
        0
      );
    }

    res.status(201).json(visit);
  }
);

router.post('/browser-visits/batch',
  body('childProfileId').isUUID(),
  body('visits').isArray({ min: 1, max: 100 }),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const visits = req.body.visits.map((v: {
      url: string; domain: string; title?: string; visitedAt: string; browserApp?: string;
    }) => ({
      childProfileId: req.body.childProfileId,
      url: v.url,
      domain: v.domain,
      title: v.title,
      visitedAt: new Date(v.visitedAt),
      browserApp: v.browserApp,
      isBlocked: false,
    }));

    await prisma.browserHistory.createMany({ data: visits, skipDuplicates: true });
    res.json({ created: visits.length });
  }
);

router.get('/browser-history/:childId',
  param('childId').isUUID(),
  query('date').optional().isISO8601(),
  query('domain').optional().trim(),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  async (req: AuthRequest, res: Response) => {
    const child = await prisma.childProfile.findFirst({
      where: { id: req.params.childId, parentId: req.userId },
    });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const limit = parseInt(req.query.limit as string) || 100;
    const where: Record<string, unknown> = { childProfileId: req.params.childId };

    if (req.query.date) {
      const d = new Date(req.query.date as string);
      where.visitedAt = { gte: d, lt: new Date(d.getTime() + 86_400_000) };
    }
    if (req.query.domain) {
      where.domain = { contains: req.query.domain, mode: 'insensitive' };
    }

    const history = await prisma.browserHistory.findMany({
      where,
      orderBy: { visitedAt: 'desc' },
      take: limit,
    });
    res.json(history);
  }
);

router.get('/top-domains/:childId',
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

    const domains = await prisma.browserHistory.groupBy({
      by: ['domain'],
      where: { childProfileId: req.params.childId, visitedAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    res.json(domains.map((d) => ({ domain: d.domain, visits: d._count.id })));
  }
);

// ── Search Terms ──────────────────────────────────────────────────────────────

router.post('/search-term',
  body('childProfileId').isUUID(),
  body('searchTerm').trim().notEmpty(),
  body('sourceApp').trim().notEmpty(),
  body('searchedAt').isISO8601(),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const entry = await prisma.keylogEntry.create({
      data: {
        childProfileId: req.body.childProfileId,
        searchTerm: req.body.searchTerm,
        sourceApp: req.body.sourceApp,
        searchedAt: new Date(req.body.searchedAt),
      },
    });
    res.status(201).json(entry);
  }
);

router.post('/search-terms/batch',
  body('childProfileId').isUUID(),
  body('terms').isArray({ min: 1, max: 100 }),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    await prisma.keylogEntry.createMany({
      data: req.body.terms.map((t: { searchTerm: string; sourceApp: string; searchedAt: string }) => ({
        childProfileId: req.body.childProfileId,
        searchTerm: t.searchTerm,
        sourceApp: t.sourceApp,
        searchedAt: new Date(t.searchedAt),
      })),
    });
    res.json({ created: req.body.terms.length });
  }
);

router.get('/search-terms/:childId',
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

    const terms = await prisma.keylogEntry.findMany({
      where: { childProfileId: req.params.childId, searchedAt: { gte: since } },
      orderBy: { searchedAt: 'desc' },
      take: 200,
    });
    res.json(terms);
  }
);

// ── Activity Timeline (all events merged) ────────────────────────────────────

router.get('/timeline/:childId',
  param('childId').isUUID(),
  query('date').optional().isISO8601(),
  async (req: AuthRequest, res: Response) => {
    const child = await prisma.childProfile.findFirst({
      where: { id: req.params.childId, parentId: req.userId },
    });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date.getTime() + 86_400_000);

    const [sessions, visits, searches, alerts] = await Promise.all([
      prisma.appSession.findMany({
        where: { childProfileId: req.params.childId, startedAt: { gte: date, lt: nextDay } },
        orderBy: { startedAt: 'desc' },
        take: 100,
      }),
      prisma.browserHistory.findMany({
        where: { childProfileId: req.params.childId, visitedAt: { gte: date, lt: nextDay } },
        orderBy: { visitedAt: 'desc' },
        take: 100,
      }),
      prisma.keylogEntry.findMany({
        where: { childProfileId: req.params.childId, searchedAt: { gte: date, lt: nextDay } },
        orderBy: { searchedAt: 'desc' },
        take: 100,
      }),
      prisma.alert.findMany({
        where: { childProfileId: req.params.childId, createdAt: { gte: date, lt: nextDay } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const timeline = [
      ...sessions.map((s) => ({ type: 'APP_SESSION', timestamp: s.startedAt, data: s })),
      ...visits.map((v) => ({ type: 'WEB_VISIT', timestamp: v.visitedAt, data: v })),
      ...searches.map((s) => ({ type: 'SEARCH', timestamp: s.searchedAt, data: s })),
      ...alerts.map((a) => ({ type: 'ALERT', timestamp: a.createdAt, data: a })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(timeline);
  }
);

export default router;
