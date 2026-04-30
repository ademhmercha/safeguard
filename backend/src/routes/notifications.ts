import { Router, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authenticate';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(notifications);
});

router.put('/:id/read',
  param('id').isUUID(),
  async (req: AuthRequest, res: Response) => {
    const notification = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { isRead: true },
    });
    res.json({ updated: notification.count });
  }
);

router.put('/read-all', async (req: AuthRequest, res: Response) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ updated: result.count });
});

router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  const count = await prisma.notification.count({
    where: { userId: req.userId, isRead: false },
  });
  res.json({ count });
});

export default router;
