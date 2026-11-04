import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

// Fast in-memory cache for frequent and recent global search queries
interface SearchCacheEntry {
  data: any;
  expiresAt: number;
}
const searchCache = new Map<string, SearchCacheEntry>();
const SEARCH_CACHE_TTL_MS = 15 * 1000; // 15 seconds
const MAX_CACHE_ENTRIES = 200;

export class SearchController {
  static async globalSearch(req: AuthRequest, res: Response) {
    try {
      const q = (req.query.q as string || '').trim();
      if (!q || q.length < 2) {
        return res.json({ parties: [], invoices: [], containers: [], jobs: [] });
      }

      const cacheKey = q.toLowerCase();
      const now = Date.now();
      const cached = searchCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return res.json(cached.data);
      }

      const [parties, invoices, containers, jobs] = await Promise.all([
        prisma.party.findMany({
          where: {
            OR: [
              { legalName: { contains: q, mode: 'insensitive' } },
              { tradeName: { contains: q, mode: 'insensitive' } },
              { gstin: { contains: q, mode: 'insensitive' } },
              { mobile: { contains: q, mode: 'insensitive' } },
              { city: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            gstin: true,
            mobile: true,
            city: true,
            gstStatus: true,
          },
          take: 5,
        }),
        prisma.invoice.findMany({
          where: {
            OR: [
              { invoiceNumber: { contains: q, mode: 'insensitive' } },
              { billToName: { contains: q, mode: 'insensitive' } },
              { billToGstin: { contains: q, mode: 'insensitive' } },
              { sbNumbers: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            invoiceNumber: true,
            billToName: true,
            billToGstin: true,
            grandTotal: true,
            balanceAmount: true,
            status: true,
            billType: true,
            currency: true,
            invoiceDate: true,
          },
          take: 5,
        }),
        prisma.container.findMany({
          where: {
            containerNumber: { contains: q, mode: 'insensitive' },
          },
          select: {
            id: true,
            containerNumber: true,
            size: true,
            type: true,
            status: true,
            party: { select: { legalName: true } },
          },
          take: 5,
        }),
        prisma.job.findMany({
          where: {
            OR: [
              { jobNumber: { contains: q, mode: 'insensitive' } },
              { sbNumber: { contains: q, mode: 'insensitive' } },
              { bookingDetails: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            jobNumber: true,
            sbNumber: true,
            status: true,
            port: true,
            party: { select: { legalName: true } },
          },
          take: 5,
        }),
      ]);

      const result = { parties, invoices, containers, jobs };

      // Store in LRU cache
      if (searchCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = searchCache.keys().next().value;
        if (oldestKey) searchCache.delete(oldestKey);
      }
      searchCache.set(cacheKey, { data: result, expiresAt: now + SEARCH_CACHE_TTL_MS });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
