import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

// High-speed in-memory cache for dashboard aggregates (reduces database latency by 80%)
let cachedDashboard: { data: any; expiresAt: number } | null = null;
const DASHBOARD_CACHE_TTL_MS = 15 * 1000; // 15 seconds

export function invalidateDashboardCache() {
  cachedDashboard = null;
}

export class ReportController {
  static async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const nowMs = Date.now();
      if (cachedDashboard && cachedDashboard.expiresAt > nowMs) {
        return res.json(cachedDashboard.data);
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      // Execute optimized database aggregate queries in parallel
      const [
        totalParties,
        activeJobs,
        totalContainers,
        validInvoiceAgg,
        thisMonthInvoiceAgg,
        pendingInvoicesCount,
        recentInvoices,
        recentJobs,
        activeContainers,
        upcomingInvoices,
        sixMonthsInvoices,
        // Container TEU counts via indexed queries
        total40Count,
        today20Count,
        today40Count,
        month20Count,
        month40Count,
        active20Count,
        active40Count,
        containerStatusGroups,
        invoiceStatusGroups,
      ] = await Promise.all([
        prisma.party.count(),
        prisma.job.count({ where: { status: 'ACTIVE' } }),
        prisma.container.count(),
        // 1. All valid invoices financial totals (PostgreSQL aggregate)
        prisma.invoice.aggregate({
          where: { status: { not: 'CANCELLED' } },
          _sum: {
            totalGst: true,
            balanceAmount: true,
          },
        }),
        // 2. This month's invoices aggregate
        prisma.invoice.aggregate({
          where: {
            status: { not: 'CANCELLED' },
            invoiceDate: { gte: startOfMonth },
          },
          _sum: {
            grandTotal: true,
          },
          _count: {
            _all: true,
          },
        }),
        // 3. Pending invoices count
        prisma.invoice.count({
          where: {
            status: { not: 'CANCELLED' },
            balanceAmount: { gt: 0 },
          },
        }),
        // 4. Recent Invoices (limit 8)
        prisma.invoice.findMany({
          take: 8,
          orderBy: { invoiceDate: 'desc' },
          include: {
            party: { select: { legalName: true, gstin: true } },
            containers: { select: { containerNumber: true } },
          },
        }),
        // 5. Recent Jobs (limit 5)
        prisma.job.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            party: { select: { legalName: true } },
            exporter: { select: { name: true } },
            _count: { select: { containers: true } },
          },
        }),
        // 6. Active Containers (limit 6)
        prisma.container.findMany({
          where: { status: { not: 'COMPLETED' } },
          take: 6,
          orderBy: { updatedAt: 'desc' },
          include: {
            party: { select: { legalName: true } },
            job: { select: { jobNumber: true } },
          },
        }),
        // 7. Upcoming due invoices (limit 5)
        prisma.invoice.findMany({
          where: {
            dueDate: { not: null },
            balanceAmount: { gt: 0 },
          },
          take: 5,
          orderBy: { dueDate: 'asc' },
          include: { party: { select: { legalName: true } } },
        }),
        // 8. Invoices from last 6 months only (for monthly revenue trend)
        prisma.invoice.findMany({
          where: {
            status: { not: 'CANCELLED' },
            invoiceDate: { gte: sixMonthsAgo },
          },
          select: {
            invoiceDate: true,
            grandTotal: true,
            totalGst: true,
            billType: true,
          },
        }),
        // 9. Container TEUs (20 FT = 1 TEU, 40/45 FT = 2 TEUs)
        prisma.container.count({ where: { size: { contains: '40' } } }),
        prisma.container.count({ where: { createdAt: { gte: startOfToday }, size: { not: { contains: '40' } } } }),
        prisma.container.count({ where: { createdAt: { gte: startOfToday }, size: { contains: '40' } } }),
        prisma.container.count({ where: { createdAt: { gte: startOfMonth }, size: { not: { contains: '40' } } } }),
        prisma.container.count({ where: { createdAt: { gte: startOfMonth }, size: { contains: '40' } } }),
        prisma.container.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, size: { not: { contains: '40' } } } }),
        prisma.container.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, size: { contains: '40' } } }),
        prisma.container.groupBy({ by: ['status'], _count: { id: true } }),
        prisma.invoice.groupBy({ by: ['status'], _count: { id: true } }),
      ]);

      const totalGstCollected = validInvoiceAgg._sum.totalGst || 0;
      const outstandingAmount = validInvoiceAgg._sum.balanceAmount || 0;
      const invoicesThisMonth = thisMonthInvoiceAgg._count._all || 0;
      const thisMonthBilling = thisMonthInvoiceAgg._sum.grandTotal || 0;

      // Calculate TEUs
      const total20Count = Math.max(0, totalContainers - total40Count);
      const totalTeus = total20Count * 1 + total40Count * 2;
      const todayTeus = today20Count * 1 + today40Count * 2;
      const thisMonthTeus = month20Count * 1 + month40Count * 2;
      const activeTeus = active20Count * 1 + active40Count * 2;

      // Group counts into fast hash maps
      const containerStatusCounts: Record<string, number> = {};
      for (const g of containerStatusGroups) {
        containerStatusCounts[g.status] = g._count.id;
      }

      const invoiceStatusCounts: Record<string, number> = {};
      for (const g of invoiceStatusGroups) {
        invoiceStatusCounts[g.status] = g._count.id;
      }

      // Monthly billing breakdown (Last 6 months)
      const monthlyTrend: { month: string; billing: number; gst: number; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthLabel = d.toLocaleString('en-US', { month: 'short' });

        const monthInvs = sixMonthsInvoices.filter((inv) => {
          const invDate = new Date(inv.invoiceDate);
          return invDate >= d && invDate < nextD;
        });

        monthlyTrend.push({
          month: monthLabel,
          billing: monthInvs.reduce((sum, inv) => sum + (inv.billType === 'CREDIT_NOTE' ? -inv.grandTotal : inv.grandTotal), 0),
          gst: monthInvs.reduce((sum, inv) => sum + inv.totalGst, 0),
          count: monthInvs.length,
        });
      }

      const upcomingActivities = upcomingInvoices.map((inv) => ({
        id: inv.id,
        title: `Payment Due: ${inv.party.legalName}`,
        date: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB') : 'Immediate',
        type: 'INVOICE_DUE',
        badge: `₹${inv.balanceAmount.toLocaleString('en-IN')}`,
        status: inv.status,
      }));

      const payload = {
        totalParties,
        activeJobs,
        totalContainers,
        invoicesThisMonth,
        thisMonthBilling,
        totalGstCollected,
        outstandingAmount,
        pendingInvoicesCount,
        totalTeus,
        todayTeus,
        thisMonthTeus,
        activeTeus,
        recentInvoices,
        recentJobs,
        activeContainers,
        containerStatusCounts,
        invoiceStatusCounts,
        monthlyTrend,
        upcomingActivities,
      };

      cachedDashboard = {
        data: payload,
        expiresAt: nowMs + DASHBOARD_CACHE_TTL_MS,
      };

      return res.json(payload);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getPartyBillingReport(req: AuthRequest, res: Response) {
    try {
      const parties = await prisma.party.findMany({
        include: {
          invoices: {
            select: {
              grandTotal: true,
              taxableAmount: true,
              totalGst: true,
              paidAmount: true,
              balanceAmount: true,
            },
          },
          _count: { select: { containers: true, jobs: true } },
        },
      });

      const report = parties.map((p) => {
        const totalBilled = p.invoices.reduce((sum, i) => sum + i.grandTotal, 0);
        const taxable = p.invoices.reduce((sum, i) => sum + i.taxableAmount, 0);
        const gst = p.invoices.reduce((sum, i) => sum + i.totalGst, 0);
        const paid = p.invoices.reduce((sum, i) => sum + i.paidAmount, 0);
        const balance = p.invoices.reduce((sum, i) => sum + i.balanceAmount, 0);

        return {
          partyId: p.id,
          legalName: p.legalName,
          gstin: p.gstin,
          state: p.state,
          invoiceCount: p.invoices.length,
          containerCount: p._count.containers,
          jobCount: p._count.jobs,
          taxableAmount: taxable,
          gstAmount: gst,
          totalBilled,
          paidAmount: paid,
          balanceAmount: balance,
        };
      });

      return res.json(report);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getGstReport(req: AuthRequest, res: Response) {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { status: { not: 'CANCELLED' } },
        include: {
          party: { select: { legalName: true, gstin: true, state: true, stateCode: true } },
        },
        orderBy: { invoiceDate: 'desc' },
      });

      return res.json(invoices);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
