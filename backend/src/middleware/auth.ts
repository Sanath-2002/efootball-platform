import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CompetitionRole } from '@prisma/client';
import { Permission } from '../lib/permissions';
import { getJwtSecret } from '../config/env';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
  competitionId?: string;
  membership?: {
    role: CompetitionRole;
    permissions: Permission[];
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, getJwtSecret(), (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user as AuthRequest['user'];
    next();
  });
};
