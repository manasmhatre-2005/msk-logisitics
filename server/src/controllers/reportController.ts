import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export class ReportController {
  static async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalParties, activeJobs, totalContainers, allInvoices] = await Promise.all([
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
            status: true,
            invoiceDate: true,
          },
        }),
      ]);

      const thisMonthInvoices = allInvoices.filter((inv) => new Date(inv.invoiceDate) >= startOfMonth);
      const thisMonthBilling = thisMonthInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      const totalGstCollected = allInvoices.reduce((sum, inv) => sum + inv.totalGst, 0);
      const outstandingAmount = allInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);
      const pendingInvoicesCount = allInvoices.filter((inv) => inv.balanceAmount > 0).length;

      // Recent Invoices
      const recentInvoices = await prisma.invoice.findMany({
        take: 8,
        orderBy: { invoiceDate: 'desc' },
        include: {
          party: { select: { legalName: true, gstin: true } },
          containers: { select: { containerNumber: true } },
        },
      });

      // Recent Jobs
      const recentJobs = await prisma.job.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          party: { select: { legalName: true } },
          exporter: { select: { name: true } },
          _count: { select: { containers: true } },
        },
      });

      // Upcoming / Active Container Operations
      const activeContainers = await prisma.container.findMany({
        where: { status: { not: 'COMPLETED' } },
        take: 6,
        orderBy: { updatedAt: 'desc' },
        include: {
          party: { select: { legalName: true } },
          job: { select: { jobNumber: true } },
        },
      });

      // Operational Breakdown
      const containerStatusCounts: Record<string, number> = {};
      const allContainersForStatus = await prisma.container.findMany({
        select: { status: true },
      });
      for (const c of allContainersForStatus) {
        containerStatusCounts[c.status] = (containerStatusCounts[c.status] || 0) + 1;
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

      // Real upcoming activities & due dates from database
      const upcomingInvoices = await prisma.invoice.findMany({
        where: {
          dueDate: { not: null },
          balanceAmount: { gt: 0 },
        },
        take: 5,
        orderBy: { dueDate: 'asc' },
        include: { party: { select: { legalName: true } } },
      });

      const upcomingActivities = upcomingInvoices.map((inv) => ({
        id: inv.id,
        title: `Payment Due: ${inv.invoiceNumber}`,
        subtitle: inv.party?.legalName || inv.billToName,
        date: inv.dueDate,
        type: 'INVOICE_DUE',
        badge: `₹${inv.balanceAmount.toLocaleString('en-IN')}`,
        status: inv.status,
      }));

      return res.json({
        totalParties,
        activeJobs,
        totalContainers,
        invoicesThisMonth: thisMonthInvoices.length,
        thisMonthBilling,
        totalGstCollected,
        outstandingAmount,
        pendingInvoicesCount,
        recentInvoices,
        recentJobs,
        activeContainers,
        containerStatusCounts,
        invoiceStatusCounts,
        monthlyTrend,
        upcomingActivities,
      });
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
