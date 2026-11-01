import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';

export class SequenceService {
  /**
   * Determine Indian Financial Year (e.g. April 2026 - March 2027 => "2026-27")
   */
  static getFinancialYear(date: Date = new Date()): string {
    const month = date.getMonth(); // 0-11 (April is 3)
    const year = date.getFullYear();
    if (month >= 3) {
      const nextYear = String(year + 1).slice(-2);
      return `${year}-${nextYear}`;
    } else {
      const prevYear = year - 1;
      const currentYear = String(year).slice(-2);
      return `${prevYear}-${currentYear}`;
    }
  }

  /**
   * Get standard prefix for bill type
   */
  static getPrefixForBillType(billType: string, companyPrefix?: string): string {
    const cleanPrefix = (companyPrefix || 'MSK/HT').trim().replace(/\/+$/, '');
    switch (billType) {
      case 'CREDIT_NOTE':
        return 'MSK/CN';
      case 'EMPTY_CONTAINER':
        return 'MSK/EC';
      case 'HT_BILL':
        return cleanPrefix || 'MSK/HT';
      case 'FORWARDING':
        return 'MSK/FWD';
      default:
        return cleanPrefix || 'MSK/HT';
    }
  }

  /**
   * Atomically generate a concurrency-safe, gapless, conflict-free sequence number
   * inside an active Prisma transaction.
   */
  static async getNextInvoiceNumber(
    tx: Prisma.TransactionClient,
    billType: string,
    invoiceDate: Date = new Date(),
    companyPrefix?: string
  ): Promise<string> {
    const finYear = this.getFinancialYear(invoiceDate);
    const prefix = this.getPrefixForBillType(billType, companyPrefix);
    const sequenceId = `${prefix.replace(/[\/\\]/g, '_')}_${finYear}`;

    // Check if sequence row exists
    let existingSeq = await tx.invoiceSequence.findUnique({
      where: {
        prefix_financialYear: { prefix, financialYear: finYear },
      },
    });

    let nextNumber: number;

    if (!existingSeq) {
      // Find maximum sequence already present in the database to prevent duplicate collisions
      const existingInvoices = await tx.invoice.findMany({
        where: {
          invoiceNumber: { startsWith: `${prefix}/${finYear}/` },
        },
        select: { invoiceNumber: true },
      });

      let maxFound = 0;
      for (const inv of existingInvoices) {
        const parts = inv.invoiceNumber.split('/');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxFound) {
          maxFound = num;
        }
      }

      nextNumber = maxFound + 1;

      // Create new sequence starting from maxFound + 1
      await tx.invoiceSequence.create({
        data: {
          id: sequenceId,
          prefix,
          financialYear: finYear,
          currentSeq: nextNumber,
        },
      });
    } else {
      // Atomic increment under database row lock
      const updatedSeq = await tx.invoiceSequence.update({
        where: {
          prefix_financialYear: { prefix, financialYear: finYear },
        },
        data: {
          currentSeq: { increment: 1 },
        },
      });
      nextNumber = updatedSeq.currentSeq;
    }

    // Format number: e.g. 0001 for HT/EC/FWD, 001 for CN
    const padLength = billType === 'CREDIT_NOTE' ? 3 : 4;
    return `${prefix}/${finYear}/${String(nextNumber).padStart(padLength, '0')}`;
  }

  /**
   * Preview the next invoice sequence number without incrementing or locking
   */
  static async peekNextInvoiceNumber(
    billType: string,
    invoiceDate: Date = new Date(),
    companyPrefix?: string
  ): Promise<string> {
    const finYear = this.getFinancialYear(invoiceDate);
    const prefix = this.getPrefixForBillType(billType, companyPrefix);

    const existingSeq = await prisma.invoiceSequence.findUnique({
      where: {
        prefix_financialYear: { prefix, financialYear: finYear },
      },
    });

    let nextNumber: number;

    if (!existingSeq) {
      const existingInvoices = await prisma.invoice.findMany({
        where: {
          invoiceNumber: { startsWith: `${prefix}/${finYear}/` },
        },
        select: { invoiceNumber: true },
      });

      let maxFound = 0;
      for (const inv of existingInvoices) {
        const parts = inv.invoiceNumber.split('/');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxFound) {
          maxFound = num;
        }
      }

      nextNumber = maxFound + 1;
    } else {
      nextNumber = existingSeq.currentSeq + 1;
    }

    const padLength = billType === 'CREDIT_NOTE' ? 3 : 4;
    return `${prefix}/${finYear}/${String(nextNumber).padStart(padLength, '0')}`;
  }
}
