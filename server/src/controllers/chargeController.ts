import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export class ChargeController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const { category, activeOnly } = req.query;
      const where: any = {};
      if (category) where.category = String(category);
      if (activeOnly === 'true') where.isActive = true;

      const charges = await prisma.chargeMaster.findMany({
        where,
        orderBy: { code: 'asc' },
      });
      return res.json(charges);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const { code, name, category = 'LOGISTICS', hsnSacCode = '996719', unit = 'PER_CONTAINER', defaultRate = 0, gstRate = 18.0, isActive = true, description } = req.body;
      if (!name) return res.status(400).json({ error: 'Charge Name is required' });

      let chargeCode = code;
      if (!chargeCode) {
        const count = await prisma.chargeMaster.count();
        chargeCode = `CHG-${String(count + 1).padStart(3, '0')}`;
      }

      const charge = await prisma.chargeMaster.create({
        data: {
          code: chargeCode,
          name,
          category,
          hsnSacCode,
          unit,
          defaultRate: Number(defaultRate || 0),
          gstRate: Number(gstRate || 18.0),
          isActive: Boolean(isActive),
          description,
        },
      });

      await logAudit({
        action: 'CREATE',
        entityType: 'CHARGE',
        entityId: charge.id,
        details: `Created charge: ${charge.name} (${charge.code})`,
        req,
      });

      return res.status(201).json(charge);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = { ...req.body };
      delete data.id;

      if (data.defaultRate !== undefined) data.defaultRate = Number(data.defaultRate);
      if (data.gstRate !== undefined) data.gstRate = Number(data.gstRate);

      const updated = await prisma.chargeMaster.update({
        where: { id },
        data,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.chargeMaster.delete({ where: { id } });
      return res.json({ message: 'Charge deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
