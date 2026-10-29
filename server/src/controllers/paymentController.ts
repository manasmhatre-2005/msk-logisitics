import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

export class PaymentController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const { partyId, invoiceId } = req.query;
      const where: any = {};
      if (partyId) where.partyId = String(partyId);
      if (invoiceId) where.invoiceId = String(invoiceId);

      const payments = await prisma.payment.findMany({
        where,
        include: {
          invoice: { select: { id: true, invoiceNumber: true, grandTotal: true, balanceAmount: true, currency: true } },
          party: { select: { id: true, legalName: true, gstin: true } },
        },
        orderBy: { paymentDate: 'desc' },
      });

      return res.json(payments);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async record(req: AuthRequest, res: Response) {
    try {
      const { invoiceId, amount, paymentDate, paymentMode = 'NEFT/RTGS', referenceNumber, notes } = req.body;

      if (!invoiceId || !amount) {
        return res.status(400).json({ error: 'Invoice ID and payment amount are required' });
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { party: true },
      });

      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      const payAmount = Number(amount);
      if (payAmount <= 0) {
        return res.status(400).json({ error: 'Payment amount must be greater than zero' });
      }

      const newPaidTotal = invoice.paidAmount + payAmount;
      const newBalance = Math.max(0, invoice.grandTotal - newPaidTotal);
      const newStatus = newBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

      // Record payment
      const payment = await prisma.payment.create({
        data: {
          invoiceId,
          partyId: invoice.partyId,
          amount: payAmount,
          currency: invoice.currency || 'INR',
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMode,
          referenceNumber,
          notes,
          recordedBy: req.user?.name || 'Authorized User',
        },
      });

      // Update invoice status & balance
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidTotal,
          balanceAmount: newBalance,
          status: newStatus,
        },
      });

      const sym = invoice.currency === 'USD' ? '$' : '₹';
      const loc = invoice.currency === 'USD' ? 'en-US' : 'en-IN';
      await logAudit({
        action: 'PAYMENT_RECORDED',
        entityType: 'PAYMENT',
        entityId: payment.id,
        details: `Recorded ${sym}${payAmount.toLocaleString(loc)} payment for invoice ${invoice.invoiceNumber}. New balance: ${sym}${newBalance.toLocaleString(loc)}`,
        req,
      });

      return res.status(201).json(payment);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
