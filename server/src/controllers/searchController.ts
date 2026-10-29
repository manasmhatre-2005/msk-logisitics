import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export class SearchController {
  static async globalSearch(req: AuthRequest, res: Response) {
    try {
      const q = (req.query.q as string || '').trim();
      if (!q || q.length < 2) {
        return res.json({ parties: [], invoices: [], containers: [], jobs: [] });
      }

      const [parties, invoices, containers, jobs] = await Promise.all([
        prisma.party.findMany({
          where: {
            OR: [
              { legalName: { contains: q } },
              { gstin: { contains: q } },
              { mobile: { contains: q } },
              { city: { contains: q } },
            ],
          },
          take: 5,
        }),
        prisma.invoice.findMany({
          where: {
            OR: [
              { invoiceNumber: { contains: q } },
              { billToName: { contains: q } },
              { billToGstin: { contains: q } },
              { sbNumbers: { contains: q } },
            ],
          },
          take: 5,
        }),
        prisma.container.findMany({
          where: {
            containerNumber: { contains: q },
          },
          include: {
            party: { select: { legalName: true } },
          },
          take: 5,
        }),
        prisma.job.findMany({
          where: {
            OR: [
              { jobNumber: { contains: q } },
              { sbNumber: { contains: q } },
              { bookingDetails: { contains: q } },
            ],
          },
          include: {
            party: { select: { legalName: true } },
          },
          take: 5,
        }),
      ]);

      return res.json({
        parties,
        invoices,
        containers,
        jobs,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
