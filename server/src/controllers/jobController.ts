import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export class JobController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const { status, partyId } = req.query;
      const where: any = {};
      if (status) where.status = String(status);
      if (partyId) where.partyId = String(partyId);

      const jobs = await prisma.job.findMany({
        where,
        include: {
          party: { select: { id: true, legalName: true, gstin: true } },
          exporter: { select: { id: true, name: true } },
          containers: true,
          _count: { select: { containers: true, invoices: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(jobs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const job = await prisma.job.findUnique({
        where: { id },
        include: {
          party: true,
          exporter: true,
          containers: true,
          invoices: true,
        },
      });

      if (!job) return res.status(404).json({ error: 'Job not found' });
      return res.json(job);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const {
        partyId,
        exporterId,
        sbNumber,
        bookingDetails,
        shipmentRef,
        shipmentDate,
        port = 'Nhava Sheva (JNPT)',
        destination,
        remarks,
        status = 'ACTIVE',
      } = req.body;

      if (!partyId) {
        return res.status(400).json({ error: 'Party ID is required' });
      }

      // Generate next Job number if not provided
      let jobNumber = req.body.jobNumber;
      if (!jobNumber) {
        const count = await prisma.job.count();
        const year = new Date().getFullYear();
        jobNumber = `JOB-${year}-${String(count + 1).padStart(4, '0')}`;
      }

      const job = await prisma.job.create({
        data: {
          jobNumber,
          partyId,
          exporterId,
          sbNumber,
          bookingDetails,
          shipmentRef,
          shipmentDate: shipmentDate ? new Date(shipmentDate) : null,
          port,
          destination,
          remarks,
          status,
        },
        include: {
          party: true,
          exporter: true,
        },
      });

      await logAudit({
        action: 'CREATE',
        entityType: 'JOB',
        entityId: job.id,
        details: `Created Job: ${job.jobNumber} for ${job.party.legalName}`,
        req,
      });

      return res.status(201).json(job);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = { ...req.body };
      delete data.id;
      if (data.shipmentDate) data.shipmentDate = new Date(data.shipmentDate);

      const updated = await prisma.job.update({
        where: { id },
        data,
        include: { party: true, exporter: true, containers: true },
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.job.delete({ where: { id } });
      return res.json({ message: 'Job deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
