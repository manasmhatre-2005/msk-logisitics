import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export class AuditController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const { entityType, entityId } = req.query;
      const where: any = {};
      if (entityType) where.entityType = String(entityType);
      if (entityId) where.entityId = String(entityId);

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return res.json(logs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
