import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authenticate';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  const children = await prisma.childProfile.findMany({
    where: { parentId: req.userId },
    include: { devices: { select: { id: true, deviceName: true, isLocked: true, lastSeen: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(children);
});

router.post('/',
  body('name').trim().notEmpty(),
  body('age').isInt({ min: 1, max: 17 }),
  body('dailyScreenLimit').optional().isInt({ min: 0 }),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const child = await prisma.childProfile.create({
      data: {
        parentId: req.userId!,
        name: req.body.name,
        age: req.body.age,
        dailyScreenLimit: req.body.dailyScreenLimit ?? 120,
        bedtimeStart: req.body.bedtimeStart,
        bedtimeEnd: req.body.bedtimeEnd,
      },
    });
    res.status(201).json(child);
  }
);

router.get('/:id',
  param('id').isUUID(),
  async (req: AuthRequest, res: Response) => {
    const child = await prisma.childProfile.findFirst({
      where: { id: req.params.id, parentId: req.userId },
      include: {
        devices: true,
        restrictionPolicies: true,
      },
    });
    if (!child) return res.status(404).json({ error: 'Child profile not found' });
    res.json(child);
  }
);

router.put('/:id',
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('age').optional().isInt({ min: 1, max: 17 }),
  body('dailyScreenLimit').optional().isInt({ min: 0 }),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existing = await prisma.childProfile.findFirst({
      where: { id: req.params.id, parentId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Child profile not found' });

    const child = await prisma.childProfile.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        age: req.body.age,
        dailyScreenLimit: req.body.dailyScreenLimit,
        bedtimeStart: req.body.bedtimeStart,
        bedtimeEnd: req.body.bedtimeEnd,
      },
    });
    res.json(child);
  }
);

router.delete('/:id',
  param('id').isUUID(),
  async (req: AuthRequest, res: Response) => {
    const existing = await prisma.childProfile.findFirst({
      where: { id: req.params.id, parentId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Child profile not found' });

    await prisma.childProfile.delete({ where: { id: req.params.id } });
    res.json({ message: 'Child profile deleted' });
  }
);

export default router;
