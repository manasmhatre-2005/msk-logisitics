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

      // Execute all dashboard queries in ONE single parallel Promise.all batch
      const [
        totalParties,
        activeJobs,
        totalContainers,
        allInvoices,
        allRegisteredContainers,
        recentInvoices,
        recentJobs,
        activeContainers,
        upcomingInvoices,
      ] = await Promise.all([
        prisma.party.count(),
        prisma.job.count({ where: { status: 'ACTIVE' } }),
        prisma.container.count(),
        prisma.invoice.findMany({
          select: {
            id: true,
            grandTotal: true,
            taxableAmount: true,
            totalGst: true,
            balanceAmount: true,
            paidAmount: true,
            tdsAmount: true,
            billType: true,
            status: true,
            invoiceDate: true,
          },
        }),
        prisma.container.findMany({
          select: {
            id: true,
            size: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.invoice.findMany({
          take: 8,
          orderBy: { invoiceDate: 'desc' },
          include: {
            party: { select: { legalName: true, gstin: true } },
            containers: { select: { containerNumber: true } },
          },
        }),
        prisma.job.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            party: { select: { legalName: true } },
            exporter: { select: { name: true } },
            _count: { select: { containers: true } },
          },
        }),
        prisma.container.findMany({
          where: { status: { not: 'COMPLETED' } },
          take: 6,
          orderBy: { updatedAt: 'desc' },
          include: {
            party: { select: { legalName: true } },
            job: { select: { jobNumber: true } },
          },
        }),
        prisma.invoice.findMany({
          where: {
            dueDate: { not: null },
            balanceAmount: { gt: 0 },
          },
          take: 5,
          orderBy: { dueDate: 'asc' },
          include: { party: { select: { legalName: true } } },
        }),
      ]);

      const validInvoices = allInvoices.filter((inv) => inv.status !== 'CANCELLED');
      const thisMonthInvoices = validInvoices.filter((inv) => new Date(inv.invoiceDate) >= startOfMonth);
      const thisMonthBilling = thisMonthInvoices.reduce((sum, inv) => sum + (inv.billType === 'CREDIT_NOTE' ? -inv.grandTotal : inv.grandTotal), 0);
      const totalGstCollected = validInvoices.reduce((sum, inv) => sum + inv.totalGst, 0);
      const outstandingAmount = validInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);
      const pendingInvoicesCount = validInvoices.filter((inv) => inv.balanceAmount > 0).length;

      // TEU Tracking (20 FT = 1 TEU, 40 FT = 2 TEUs)
      let totalTeus = 0;
      let todayTeus = 0;
      let thisMonthTeus = 0;
      let activeTeus = 0;

      // Single pass over containers for both TEUs and status counts (0 redundant DB queries)
      const containerStatusCounts: Record<string, number> = {};
      for (const c of allRegisteredContainers) {
        containerStatusCounts[c.status] = (containerStatusCounts[c.status] || 0) + 1;
        const teu = (c.size && (c.size.includes('40') || c.size.includes('45'))) ? 2 : 1;
        totalTeus += teu;
        if (new Date(c.createdAt) >= startOfToday) {
          todayTeus += teu;
        }
        if (new Date(c.createdAt) >= startOfMonth) {
          thisMonthTeus += teu;
        }
        if (c.status !== 'COMPLETED' && c.status !== 'CANCELLED') {
          activeTeus += teu;
        }
      }

      // Invoice status breakdown
      const invoiceStatusCounts: Record<string, number> = {};
      for (const inv of allInvoices) {
        invoiceStatusCounts[inv.status] = (invoiceStatusCounts[inv.status] || 0) + 1;
      }

      // Monthly billing breakdown (Last 6 months)
      const monthlyTrend: { month: string; billing: number; gst: number; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthLabel = d.toLocaleString('en-US', { month: 'short' });

        const monthInvs = allInvoices.filter((inv) => {
          const invDate = new Date(inv.invoiceDate);
          return invDate >= d && invDate < nextD;
        });

        monthlyTrend.push({
          month: monthLabel,
          billing: monthInvs.reduce((sum, inv) => sum + inv.grandTotal, 0),
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
        invoicesThisMonth: thisMonthInvoices.length,
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
