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
