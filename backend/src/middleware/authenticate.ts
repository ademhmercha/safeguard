import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabase';
import { prisma } from '../utils/prisma';

export interface AuthRequest extends Request {
  userId?: string;
  supabaseId?: string;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.userId = dbUser.id;
  req.supabaseId = user.id;
  next();
}
