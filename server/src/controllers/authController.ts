import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { config } from '../config/index.js';
import { AuthRequest } from '../middleware/auth.js';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (!process.env.DATABASE_URL) {
        return res.status(503).json({
          error: 'DATABASE_CONFIGURATION_REQUIRED',
          message: 'Database connection required: Please configure DATABASE_URL in Vercel project environment variables (e.g. Neon, Supabase, or Vercel Postgres connection string).',
        });
      }

      // Check if fresh database needs initial seed
      try {
        const userCount = await prisma.user.count();
        if (userCount === 0) {
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash('admin123', salt);
          await prisma.user.create({
            data: {
              email: 'admin@logibill.com',
              passwordHash,
              name: 'Amitabh Sharma (Admin)',
              role: 'ADMIN',
            },
          });
        }
      } catch (seedErr) {
        // Continue if table doesn't exist yet or other schema check
      }

      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (!user || !user.active) {
        return res.status(401).json({ error: 'Invalid email or user account disabled' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getMe(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, name: true, role: true, avatarUrl: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ user });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async listUsers(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
        orderBy: { name: 'asc' },
      });
      return res.json(users);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
