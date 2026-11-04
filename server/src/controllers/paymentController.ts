import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { invalidateDashboardCache } from './reportController.js';

export class PaymentController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const { partyId, invoiceId, batchId } = req.query;
      const where: any = {};
      if (partyId) where.partyId = String(partyId);
      if (invoiceId) where.invoiceId = String(invoiceId);
      if (batchId) where.batchId = String(batchId);

      const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 500) : 250;
      const page = req.query.page ? Math.max(Number(req.query.page), 1) : 1;
      const skip = req.query.page ? (page - 1) * limit : undefined;

      const payments = await prisma.payment.findMany({
        where,
        take: limit,
        ...(skip !== undefined ? { skip } : {}),
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              grandTotal: true,
              balanceAmount: true,
              paidAmount: true,
              tdsAmount: true,
              currency: true,
              status: true,
            },
          },
          party: { select: { id: true, legalName: true, gstin: true } },
        },
        orderBy: { paymentDate: 'desc' },
      });

      return res.json(payments);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get comprehensive party-wise outstanding balances and invoice details
   */
  static async getPartyOutstanding(req: AuthRequest, res: Response) {
    try {
      const { partyId, status } = req.query;

      const invoiceWhere: any = {
        status: { not: 'CANCELLED' },
      };

      if (status && status !== 'ALL') {
        if (status === 'PENDING') {
          invoiceWhere.status = { in: ['DRAFT', 'FINALIZED', 'SENT', 'OVERDUE'] };
          invoiceWhere.balanceAmount = { gt: 0 };
        } else {
          invoiceWhere.status = String(status);
        }
      }

      const parties = await prisma.party.findMany({
        where: partyId ? { id: String(partyId) } : {},
        include: {
          invoices: {
            where: invoiceWhere,
            select: {
              id: true,
              invoiceNumber: true,
              invoiceDate: true,
              dueDate: true,
              billType: true,
              status: true,
              currency: true,
              grandTotal: true,
              taxableAmount: true,
              totalGst: true,
              paidAmount: true,
              tdsAmount: true,
              balanceAmount: true,
              containers: { select: { containerNumber: true, size: true, type: true } },
            },
            orderBy: { invoiceDate: 'desc' },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              tdsAmount: true,
              paymentDate: true,
              paymentMode: true,
              referenceNumber: true,
            },
          },
        },
        orderBy: { legalName: 'asc' },
      });

      const partySummaries = parties.map((p) => {
        let totalInvoiced = 0;
        let totalCreditNotes = 0;
        let totalPaid = 0;
        let totalTds = 0;
        for (const inv of p.invoices) {
          if (inv.billType === 'CREDIT_NOTE') {
            totalCreditNotes += inv.grandTotal;
          } else {
            totalInvoiced += inv.grandTotal;
          }
          totalPaid += inv.paidAmount;
          totalTds += inv.tdsAmount || 0;
        }

        const netOutstanding = Math.max(0, totalInvoiced - totalCreditNotes - totalPaid - totalTds);

        return {
          partyId: p.id,
          legalName: p.legalName,
          tradeName: p.tradeName,
          gstin: p.gstin,
          state: p.state,
          totalInvoiced,
          totalCreditNotes,
          totalPaid,
          totalTds,
          netOutstanding,
          invoiceCount: p.invoices.length,
          invoices: p.invoices,
        };
      });

      partySummaries.sort((a, b) => b.netOutstanding - a.netOutstanding);
      return res.json(partySummaries);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Record Customer Payment: Supports single-invoice payment and multi-invoice allocations with TDS
   */
  static async record(req: AuthRequest, res: Response) {
    try {
      const {
        partyId: bodyPartyId,
        invoiceId,
        amount,
        tdsRate = 0,
        tdsAmount = 0,
        paymentDate,
        paymentMode = 'NEFT/RTGS',
        referenceNumber,
        notes,
        allocations, // Array of { invoiceId: string, amount: number, tdsAmount?: number, tdsRate?: number }
      } = req.body;

      const pDate = paymentDate ? new Date(paymentDate) : new Date();
      const batchId = `PAY_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Case 1: Multi-Invoice Payment Allocation
      if (allocations && Array.isArray(allocations) && allocations.length > 0) {
        if (!bodyPartyId) {
          return res.status(400).json({ error: 'Party ID is required for multi-invoice payment allocation.' });
        }

        const party = await prisma.party.findUnique({ where: { id: bodyPartyId } });
        if (!party) return res.status(404).json({ error: 'Party not found.' });

        const results = await prisma.$transaction(async (tx) => {
          const createdPayments: any[] = [];

          for (const alloc of allocations) {
            const allocAmt = Number(alloc.amount || 0);
            const allocTds = Number(alloc.tdsAmount || 0);
            const allocRate = Number(alloc.tdsRate !== undefined ? alloc.tdsRate : tdsRate);

            if (allocAmt <= 0 && allocTds <= 0) continue;

            const inv = await tx.invoice.findUnique({
              where: { id: alloc.invoiceId },
            });

            if (!inv) {
              throw new Error(`Invoice ID ${alloc.invoiceId} not found.`);
            }

            if (inv.partyId !== bodyPartyId) {
              throw new Error(`Invoice ${inv.invoiceNumber} does not belong to party ${party.legalName}. Cross-party allocation is prohibited.`);
            }

            // Accounting rule: Net Outstanding = grandTotal - paidAmount - tdsAmount
            const newPaid = Math.round((inv.paidAmount + allocAmt) * 100) / 100;
            const newTds = Math.round(((inv.tdsAmount || 0) + allocTds) * 100) / 100;
            const rawBalance = Math.round(Math.max(0, inv.grandTotal - newPaid - newTds) * 100) / 100;
            const newBalance = rawBalance <= 0.01 ? 0 : rawBalance;
            const newStatus = newBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

            // Create individual payment record for the allocation
            const payRecord = await tx.payment.create({
              data: {
                invoiceId: inv.id,
                partyId: bodyPartyId,
                amount: allocAmt,
                tdsRate: allocRate,
                tdsAmount: allocTds,
                currency: inv.currency || 'INR',
                paymentDate: pDate,
                paymentMode,
                referenceNumber,
                batchId,
                notes: notes ? `${notes} (Allocated to ${inv.invoiceNumber})` : `Allocated to ${inv.invoiceNumber}`,
                recordedBy: req.user?.name || 'Authorized User',
              },
            });

            // Update invoice balances and status
            await tx.invoice.update({
              where: { id: inv.id },
              data: {
                paidAmount: newPaid,
                tdsAmount: newTds,
                balanceAmount: newBalance,
                status: newStatus,
              },
            });

            createdPayments.push(payRecord);
          }

          return createdPayments;
        }, {
          maxWait: 10000,
          timeout: 20000,
        });

        await logAudit({
          action: 'PAYMENT_RECORDED',
          entityType: 'PAYMENT',
          entityId: batchId,
          details: `Recorded batch payment of ${results.length} allocations for ${party.legalName}. Ref: ${referenceNumber || 'N/A'}`,
          req,
        });

        return res.status(201).json({
          batchId,
          count: results.length,
          payments: results,
        });
      }

      // Case 2: Single Invoice Payment
      if (!invoiceId || !amount) {
        return res.status(400).json({ error: 'Invoice ID and payment amount are required.' });
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { party: true },
      });

      if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

      const payAmount = Number(amount);
      const payTds = Number(tdsAmount || 0);
      const payTdsRate = Number(tdsRate || 0);

      if (payAmount <= 0 && payTds <= 0) {
        return res.status(400).json({ error: 'Payment amount or TDS must be greater than zero.' });
      }

      const newPaidTotal = Math.round((invoice.paidAmount + payAmount) * 100) / 100;
      const newTdsTotal = Math.round(((invoice.tdsAmount || 0) + payTds) * 100) / 100;
      const rawBalance = Math.round(Math.max(0, invoice.grandTotal - newPaidTotal - newTdsTotal) * 100) / 100;
      const newBalance = rawBalance <= 0.01 ? 0 : rawBalance;
      const newStatus = newBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

      const { payment } = await prisma.$transaction(async (tx) => {
        const paymentRecord = await tx.payment.create({
          data: {
            invoiceId,
            partyId: invoice.partyId,
            amount: payAmount,
            tdsRate: payTdsRate,
            tdsAmount: payTds,
            currency: invoice.currency || 'INR',
            paymentDate: pDate,
            paymentMode,
            referenceNumber,
            batchId,
            notes,
            recordedBy: req.user?.name || 'Authorized User',
          },
        });

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: newPaidTotal,
            tdsAmount: newTdsTotal,
            balanceAmount: newBalance,
            status: newStatus,
          },
        });

        return { payment: paymentRecord };
      }, {
        maxWait: 10000,
        timeout: 20000,
      });

      const sym = invoice.currency === 'USD' ? '$' : '₹';
      const loc = invoice.currency === 'USD' ? 'en-US' : 'en-IN';
      await logAudit({
        action: 'PAYMENT_RECORDED',
        entityType: 'PAYMENT',
        entityId: payment.id,
        details: `Recorded ${sym}${payAmount.toLocaleString(loc)} payment (TDS: ${sym}${payTds}) for invoice ${invoice.invoiceNumber}. New balance: ${sym}${newBalance.toLocaleString(loc)}`,
        req,
      });

      invalidateDashboardCache();
      return res.status(201).json(payment);
    } catch (err: any) {
      console.error('Payment record error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}
