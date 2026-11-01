import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { config } from '../config/index.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail.length > 255 || password.length > 128) {
        return res.status(400).json({ error: 'Invalid input format or length.' });
      }

      if (!process.env.DATABASE_URL) {
        return res.status(503).json({
          error: 'DATABASE_CONFIGURATION_REQUIRED',
          message: 'Database connection required: Please configure DATABASE_URL in environment variables.',
        });
      }

      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      // Constant-time protection against timing-based user enumeration attacks
      let isMatch = false;
      if (user && user.active) {
        isMatch = await bcrypt.compare(password, user.passwordHash);
      } else {
        // Run dummy compare with uniform work factor
        await bcrypt.compare(password, '$2a$10$74tWvAEv5K7bFms1eF7Uv.Z2s53M515t814620023075276356789');
      }

      // Unified error response prevents account enumeration
      if (!user || !user.active || !isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // 24-hour signed JWT session
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      // Audit successful login
      await logAudit({
        action: 'UPDATE',
        entityType: 'SETTINGS',
        entityId: user.id,
        details: `User login successful: ${user.email} (${user.role})`,
        userId: user.id,
        userName: user.name,
      });

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
      return res.status(500).json({
        error: config.isProduction ? 'Internal authentication service error' : err.message,
      });
    }
  }

  static async getMe(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, name: true, role: true, avatarUrl: true, active: true },
      });

      if (!user || !user.active) {
        return res.status(401).json({ error: 'User not found or account disabled' });
      }

      return res.json({ user });
    } catch (err: any) {
      return res.status(500).json({
        error: config.isProduction ? 'Internal server error' : err.message,
      });
    }
  }

  static async listUsers(req: AuthRequest, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
        orderBy: { name: 'asc' },
      });
      return res.json(users);
    } catch (err: any) {
      return res.status(500).json({
        error: config.isProduction ? 'Internal server error' : err.message,
      });
    }
  }

  static async changePassword(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isCurrentMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });

      await logAudit({
        action: 'UPDATE',
        entityType: 'SETTINGS',
        entityId: user.id,
        details: `Password changed for user ${user.email}`,
        req,
      });

      return res.json({ success: true, message: 'Password updated successfully' });
    } catch (err: any) {
      return res.status(500).json({
        error: config.isProduction ? 'Internal server error' : err.message,
      });
    }
  }
}
