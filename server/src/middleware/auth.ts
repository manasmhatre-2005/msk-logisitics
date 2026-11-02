import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import prisma from '../prisma.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

// High-performance in-memory session cache (eliminates duplicate DB roundtrips on parallel requests)
interface CachedUserSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  expiresAt: number;
}

const userSessionCache = new Map<string, CachedUserSession>();
const USER_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function invalidateUserSession(userId?: string) {
  if (userId) {
    userSessionCache.delete(userId);
  } else {
    userSessionCache.clear();
  }
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required. Missing or invalid Bearer token.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Authentication token missing.' });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; role: string; name: string };

    const now = Date.now();
    const cached = userSessionCache.get(decoded.id);
    if (cached && cached.expiresAt > now) {
      req.user = cached.user;
      next();
      return;
    }
    
    // Verify user exists and remains active in database (revokes access immediately on deactivation)
    const activeUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, active: true },
    });

    if (!activeUser || !activeUser.active) {
      userSessionCache.delete(decoded.id);
      res.status(401).json({ error: 'User account is disabled or no longer exists.' });
      return;
    }

    const userData = {
      id: activeUser.id,
      email: activeUser.email,
      name: activeUser.name,
      role: activeUser.role,
    };

    userSessionCache.set(activeUser.id, {
      user: userData,
      expiresAt: now + USER_CACHE_TTL_MS,
    });

    // Attach fresh user details from database
    req.user = userData;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role === 'ADMIN' || allowedRoles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({ error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}` });
  };
};
