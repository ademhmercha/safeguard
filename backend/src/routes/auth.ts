import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../utils/supabase';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

const router = Router();

router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, name } = req.body;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) return res.status(400).json({ error: error.message });

    const user = await prisma.user.create({
      data: { supabaseId: data.user.id, email, name },
    });

    logger.info('User registered', { userId: user.id });
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name } });
  }
);

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: 'Invalid credentials' });

    const user = await prisma.user.upsert({
      where: { supabaseId: data.user.id },
      update: {},
      create: {
        supabaseId: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.name || data.user.email!.split('@')[0],
      },
    });

    res.json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  }
);

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error) return res.status(401).json({ error: 'Invalid refresh token' });

  res.json({ token: data.session?.access_token, refreshToken: data.session?.refresh_token });
});

router.post('/logout', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.slice(7);
  if (token) await supabase.auth.admin.signOut(token);
  res.json({ message: 'Logged out' });
});

export default router;
