import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { notificationService } from '../services/notificationService';
import { supabase } from '../utils/supabase';

const router = Router();

// ── App session (child device → backend) ─────────────────────────────────────
router.post('/activity/app-session',
  body('childProfileId').isUUID(),
  body('appName').trim().notEmpty(),
  body('packageName').trim().notEmpty(),
  body('startedAt').isISO8601(),
  body('endedAt').optional().isISO8601(),
  body('durationSecs').optional().isInt({ min: 0 }),
  async (req: Request, res: Response) => {
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

// ── Single browser visit with real-time block check (child device → backend) ─
router.post('/activity/browser-visit',
  body('childProfileId').isUUID(),
  body('url').notEmpty(),
  body('domain').trim().notEmpty(),
  body('title').optional().trim(),
  body('browserApp').optional().trim(),
  async (req: Request, res: Response) => {
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

    const domain: string = req.body.domain;
    const isBlocked = child.restrictionPolicies.some(
      (p) => domain === p.packageName || domain.endsWith(`.${p.packageName}`) || req.body.url.includes(p.packageName ?? '')
    );

    await prisma.browserHistory.create({
      data: {
        childProfileId: req.body.childProfileId,
        url: req.body.url,
        domain,
        title: req.body.title,
        visitedAt: new Date(),
        browserApp: req.body.browserApp ?? 'SafeGuard Browser',
        isBlocked,
      },
    });

    if (isBlocked) {
      await prisma.alert.create({
        data: {
          childProfileId: req.body.childProfileId,
          alertType: 'BLOCKED_SITE_ATTEMPT',
          message: `${child.name} tried to visit blocked site: ${domain}`,
          metadata: { url: req.body.url, domain },
        },
      });

      await prisma.notification.create({
        data: {
          userId: child.parent.id,
          title: 'Blocked site attempt',
          body: `${child.name} tried to visit ${domain}`,
          type: 'APP_BLOCKED',
        },
      });

      // Real-time push to parent dashboard
      await supabase.channel(`parent:${child.parent.id}`).send({
        type: 'broadcast',
        event: 'blocked_site',
        payload: { childName: child.name, domain, url: req.body.url, at: new Date().toISOString() },
      });
    }

    res.json({ isBlocked });
  }
);

// ── Browser visits batch (child device → backend) ────────────────────────────
router.post('/activity/browser-visits/batch',
  body('childProfileId').isUUID(),
  body('visits').isArray({ min: 1, max: 100 }),
  async (req: Request, res: Response) => {
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

// ── Search terms batch (child device → backend) ──────────────────────────────
router.post('/activity/search-terms/batch',
  body('childProfileId').isUUID(),
  body('terms').isArray({ min: 1, max: 100 }),
  async (req: Request, res: Response) => {
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

// ── Screen time (child device → backend) ─────────────────────────────────────
router.post('/monitoring/screen-time',
  body('childProfileId').isUUID(),
  body('totalMinutes').isInt({ min: 0 }),
  body('date').isISO8601(),
  async (req: Request, res: Response) => {
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

// ── App usage (child device → backend) ───────────────────────────────────────
router.post('/monitoring/app-usage',
  body('childProfileId').isUUID(),
  body('appName').trim().notEmpty(),
  body('packageName').trim().notEmpty(),
  body('usageMinutes').isInt({ min: 0 }),
  body('date').isISO8601(),
  async (req: Request, res: Response) => {
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

// ── Mark command executed (child device → backend) ───────────────────────────
router.post('/monitoring/command-executed',
  body('commandId').isUUID(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    await prisma.deviceCommand.update({
      where: { id: req.body.commandId },
      data: { status: 'EXECUTED', executedAt: new Date() },
    }).catch(() => null);

    res.json({ ok: true });
  }
);

// ── Update FCM token (child device → backend) ─────────────────────────────────
router.put('/devices/:id/fcm-token',
  body('fcmToken').notEmpty(),
  async (req: Request, res: Response) => {
    await prisma.device.update({
      where: { id: req.params.id },
      data: { fcmToken: req.body.fcmToken, lastSeen: new Date() },
    }).catch(() => null);

    res.json({ ok: true });
  }
);

export default router;
