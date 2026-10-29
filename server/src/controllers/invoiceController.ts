import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { CalculationService } from '../services/calculationService.js';
import { PDFService } from '../services/pdfService.js';
import { EmailService } from '../services/emailService.js';

export class InvoiceController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const { status, partyId, dateFrom, dateTo, search } = req.query;
      const where: any = {};

      if (status && status !== 'ALL') {
        where.status = String(status);
      }
      if (partyId) {
        where.partyId = String(partyId);
      }
      if (dateFrom || dateTo) {
        where.invoiceDate = {};
        if (dateFrom) where.invoiceDate.gte = new Date(String(dateFrom));
        if (dateTo) where.invoiceDate.lte = new Date(String(dateTo));
      }

      if (search) {
        const query = String(search).trim();
        where.OR = [
          { invoiceNumber: { contains: query } },
          { billToName: { contains: query } },
          { billToGstin: { contains: query } },
          { sbNumbers: { contains: query } },
          { containers: { some: { containerNumber: { contains: query } } } },
          { job: { jobNumber: { contains: query } } },
        ];
      }

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          party: { select: { id: true, legalName: true, gstin: true } },
          job: { select: { id: true, jobNumber: true } },
          containers: { select: { containerNumber: true, size: true } },
          _count: { select: { items: true, payments: true } },
        },
        orderBy: { invoiceDate: 'desc' },
      });

      return res.json(invoices);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          party: true,
          exporter: true,
          job: true,
          containers: true,
          items: {
            orderBy: { srNo: 'asc' },
          },
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
          whatsAppMessages: {
            orderBy: { sentAt: 'desc' },
          },
        },
      });

      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      return res.json(invoice);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async calculate(req: AuthRequest, res: Response) {
    try {
      const {
        items = [],
        partyStateCode = '27',
        discountAmount = 0,
        currency = 'INR',
        customCgstRate,
        customSgstRate,
        customIgstRate,
        customTotalGstRate,
        forceInterState,
      } = req.body;
      const calculation = await CalculationService.calculateInvoiceTaxes(
        items,
        partyStateCode,
        Number(discountAmount || 0),
        currency,
        {
          customCgstRate: customCgstRate !== undefined ? Number(customCgstRate) : undefined,
          customSgstRate: customSgstRate !== undefined ? Number(customSgstRate) : undefined,
          customIgstRate: customIgstRate !== undefined ? Number(customIgstRate) : undefined,
          customTotalGstRate: customTotalGstRate !== undefined ? Number(customTotalGstRate) : undefined,
          forceInterState: typeof forceInterState === 'boolean' ? forceInterState : undefined,
        }
      );
      return res.json(calculation);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const {
        invoiceNumber: customInvoiceNumber,
        invoiceDate,
        dueDate,
        partyId,
        exporterId,
        jobId,
        sbNumbers,
        consigneeName,
        consigneeAddress,
        currency = 'INR',
        items = [],
        containers = [],
        discountAmount = 0,
        notes,
        terms,
        status = 'DRAFT',
        templateId = 'format-1',
        customCgstRate,
        customSgstRate,
        customIgstRate,
        customTotalGstRate,
        forceInterState,
      } = req.body;

      if (!partyId) {
        return res.status(400).json({ error: 'Party is required to create an invoice' });
      }

      const party = await prisma.party.findUnique({ where: { id: partyId } });
      if (!party) {
        return res.status(404).json({ error: 'Party not found' });
      }

      const settings = await prisma.companySettings.findUnique({ where: { id: 'default' } });

      // Generate invoice number if not provided: MSK/HT000/OCT26 format
      let invoiceNumber = customInvoiceNumber;
      if (!invoiceNumber) {
        const invDate = invoiceDate ? new Date(invoiceDate) : new Date();
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const monthStr = months[invDate.getMonth()];
        const yearStr = String(invDate.getFullYear()).slice(-2);
        const prefix = (settings?.invoicePrefix || 'MSK/HT').trim().replace(/\/+$/, '');
        const nextSeq = settings?.nextInvoiceSeq || 1;
        invoiceNumber = `${prefix}${String(nextSeq).padStart(3, '0')}/${monthStr}${yearStr}`;
        await prisma.companySettings.update({
          where: { id: 'default' },
          data: { nextInvoiceSeq: nextSeq + 1 },
        });
      }

      // Calculate totals and taxes with custom GST options if specified
      const taxCalc = await CalculationService.calculateInvoiceTaxes(
        items,
        party.stateCode,
        discountAmount,
        currency,
        {
          customCgstRate: customCgstRate !== undefined ? Number(customCgstRate) : undefined,
          customSgstRate: customSgstRate !== undefined ? Number(customSgstRate) : undefined,
          customIgstRate: customIgstRate !== undefined ? Number(customIgstRate) : undefined,
          customTotalGstRate: customTotalGstRate !== undefined ? Number(customTotalGstRate) : undefined,
          forceInterState: typeof forceInterState === 'boolean' ? forceInterState : undefined,
        }
      );

      // Persist template selection cleanly in notes metadata
      const cleanTemplate = ['format-1', 'format-2', 'format-3', 'format-4', 'format-5'].includes(templateId)
        ? templateId
        : 'format-1';
      const notesWithTemplate = notes
        ? (notes.includes('[TEMPLATE:') ? notes.replace(/\[TEMPLATE:format-[1-5]\]/, `[TEMPLATE:${cleanTemplate}]`) : `${notes}\n[TEMPLATE:${cleanTemplate}]`)
        : `[TEMPLATE:${cleanTemplate}]`;

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          partyId,
          exporterId,
          jobId,
          status,
          currency: currency || 'INR',
          billToName: party.legalName,
          billToGstin: party.gstin,
          billToAddress: party.billingAddress || party.registeredAddress,
          billToState: party.state,
          billToStateCode: party.stateCode,
          consigneeName,
          consigneeAddress,
          sbNumbers,
          subtotal: taxCalc.subtotal,
          discountAmount: taxCalc.discountAmount,
          taxableAmount: taxCalc.taxableAmount,
          isInterState: taxCalc.isInterState,
          cgstRate: taxCalc.cgstRate,
          cgstAmount: taxCalc.cgstAmount,
          sgstRate: taxCalc.sgstRate,
          sgstAmount: taxCalc.sgstAmount,
          igstRate: taxCalc.igstRate,
          igstAmount: taxCalc.igstAmount,
          totalGst: taxCalc.totalGst,
          roundOff: taxCalc.roundOff,
          grandTotal: taxCalc.grandTotal,
          amountInWords: taxCalc.amountInWords,
          paidAmount: 0,
          balanceAmount: taxCalc.grandTotal,
          terms: terms || settings?.termsAndConditions,
          notes: notesWithTemplate || settings?.invoiceNotes,
          finalizedAt: status === 'FINALIZED' ? new Date() : null,
          finalizedBy: status === 'FINALIZED' ? req.user?.name : null,
        },
      });

      // Insert Containers
      if (containers.length > 0) {
        for (const c of containers) {
          await prisma.invoiceContainer.create({
            data: {
              invoiceId: invoice.id,
              containerId: c.containerId || null,
              containerNumber: c.containerNumber,
              size: c.size || '20 FT',
              type: c.type || 'DRY',
              cartingDate: c.cartingDate ? new Date(c.cartingDate) : null,
              emptyGateInDate: c.emptyGateInDate ? new Date(c.emptyGateInDate) : null,
              stuffingDate: c.stuffingDate ? new Date(c.stuffingDate) : null,
              lddOutDate: c.lddOutDate ? new Date(c.lddOutDate) : null,
              emptyGroundDays: Number(c.emptyGroundDays || c.emptyGroundRentDays || 0),
              daysAfterCarting: Number(c.daysAfterCarting || 0),
              loadedGroundDays: Number(c.loadedGroundDays || 0),
              htCharges: Number(c.htCharges || 0),
              logisticsCharges: Number(c.logisticsCharges || 0),
              emptyTransportCharges: Number(c.emptyTransportCharges || 0),
            },
          });
        }
      }

      // Insert Line Items
      if (items.length > 0) {
        let sr = 1;
        for (const item of items) {
          const lineQty = Number(item.quantity || 1);
          const lineRate = Number(item.rate || 0);
          const lineAmt = lineQty * lineRate;
          const lineDisc = Number(item.discount || 0);
          const lineTaxable = Math.max(0, lineAmt - lineDisc);

          const cgstAmt = taxCalc.isInterState ? 0 : Math.round(lineTaxable * (taxCalc.cgstRate / 100) * 100) / 100;
          const sgstAmt = taxCalc.isInterState ? 0 : Math.round(lineTaxable * (taxCalc.sgstRate / 100) * 100) / 100;
          const igstAmt = taxCalc.isInterState ? Math.round(lineTaxable * (taxCalc.igstRate / 100) * 100) / 100 : 0;
          const totalAmt = lineTaxable + cgstAmt + sgstAmt + igstAmt;

          await prisma.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              containerId: item.containerId || null,
              chargeMasterId: item.chargeMasterId || null,
              srNo: sr++,
              description: item.description,
              hsnSacCode: item.hsnSacCode || '996719',
              quantity: lineQty,
              unit: item.unit || 'PER_CONTAINER',
              rate: lineRate,
              amount: lineAmt,
              discount: lineDisc,
              taxableValue: lineTaxable,
              cgstRate: taxCalc.cgstRate,
              cgstAmount: cgstAmt,
              sgstRate: taxCalc.sgstRate,
              sgstAmount: sgstAmt,
              igstRate: taxCalc.igstRate,
              igstAmount: igstAmt,
              totalAmount: totalAmt,
            },
          });
        }
      }

      const sym = invoice.currency === 'USD' ? '$' : '₹';
      await logAudit({
        action: 'CREATE',
        entityType: 'INVOICE',
        entityId: invoice.id,
        details: `Created invoice ${invoice.invoiceNumber} (${invoice.status}) for ${sym}${invoice.grandTotal}`,
        req,
      });

      return res.status(201).json(invoice);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const existing = await prisma.invoice.findUnique({
        where: { id },
        include: { items: true, containers: true },
      });

      if (!existing) return res.status(404).json({ error: 'Invoice not found' });

      // If finalized and user is not admin, prevent modifying financial lines
      if (existing.status === 'FINALIZED' && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Finalized invoices cannot be modified without Admin authorization.' });
      }

      const {
        invoiceDate,
        dueDate,
        exporterId,
        jobId,
        sbNumbers,
        consigneeName,
        consigneeAddress,
        currency,
        items,
        containers,
        discountAmount,
        notes,
        terms,
        status,
        templateId,
        customCgstRate,
        customSgstRate,
        customIgstRate,
        customTotalGstRate,
        forceInterState,
      } = req.body;

      const partyStateCode = existing.billToStateCode;
      const activeCurrency = currency !== undefined ? currency : (existing.currency || 'INR');

      let activeNotes = notes !== undefined ? notes : existing.notes;
      if (templateId && ['format-1', 'format-2', 'format-3', 'format-4', 'format-5'].includes(templateId)) {
        if (activeNotes && activeNotes.includes('[TEMPLATE:')) {
          activeNotes = activeNotes.replace(/\[TEMPLATE:format-[1-5]\]/, `[TEMPLATE:${templateId}]`);
        } else if (activeNotes) {
          activeNotes = `${activeNotes}\n[TEMPLATE:${templateId}]`;
        } else {
          activeNotes = `[TEMPLATE:${templateId}]`;
        }
      }

      let updateData: any = {
        invoiceDate: invoiceDate ? new Date(invoiceDate) : existing.invoiceDate,
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        exporterId: exporterId !== undefined ? exporterId : existing.exporterId,
        jobId: jobId !== undefined ? jobId : existing.jobId,
        sbNumbers: sbNumbers !== undefined ? sbNumbers : existing.sbNumbers,
        consigneeName: consigneeName !== undefined ? consigneeName : existing.consigneeName,
        consigneeAddress: consigneeAddress !== undefined ? consigneeAddress : existing.consigneeAddress,
        notes: activeNotes,
        terms: terms !== undefined ? terms : existing.terms,
        status: status !== undefined ? status : existing.status,
      };

      if (currency !== undefined) {
        updateData.currency = currency;
      }

      if (items && Array.isArray(items)) {
        const taxCalc = await CalculationService.calculateInvoiceTaxes(
          items,
          partyStateCode,
          discountAmount !== undefined ? discountAmount : existing.discountAmount,
          activeCurrency,
          {
            customCgstRate: customCgstRate !== undefined ? Number(customCgstRate) : undefined,
            customSgstRate: customSgstRate !== undefined ? Number(customSgstRate) : undefined,
            customIgstRate: customIgstRate !== undefined ? Number(customIgstRate) : undefined,
            customTotalGstRate: customTotalGstRate !== undefined ? Number(customTotalGstRate) : undefined,
            forceInterState: typeof forceInterState === 'boolean' ? forceInterState : undefined,
          }
        );

        updateData = {
          ...updateData,
          subtotal: taxCalc.subtotal,
          discountAmount: taxCalc.discountAmount,
          taxableAmount: taxCalc.taxableAmount,
          isInterState: taxCalc.isInterState,
          cgstRate: taxCalc.cgstRate,
          cgstAmount: taxCalc.cgstAmount,
          sgstRate: taxCalc.sgstRate,
          sgstAmount: taxCalc.sgstAmount,
          igstRate: taxCalc.igstRate,
          igstAmount: taxCalc.igstAmount,
          totalGst: taxCalc.totalGst,
          roundOff: taxCalc.roundOff,
          grandTotal: taxCalc.grandTotal,
          amountInWords: taxCalc.amountInWords,
          balanceAmount: Math.max(0, taxCalc.grandTotal - existing.paidAmount),
        };

        // Replace line items
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
        let sr = 1;
        for (const item of items) {
          const lineQty = Number(item.quantity || 1);
          const lineRate = Number(item.rate || 0);
          const lineAmt = lineQty * lineRate;
          const lineDisc = Number(item.discount || 0);
          const lineTaxable = Math.max(0, lineAmt - lineDisc);

          const cgstAmt = taxCalc.isInterState ? 0 : Math.round(lineTaxable * (taxCalc.cgstRate / 100) * 100) / 100;
          const sgstAmt = taxCalc.isInterState ? 0 : Math.round(lineTaxable * (taxCalc.sgstRate / 100) * 100) / 100;
          const igstAmt = taxCalc.isInterState ? Math.round(lineTaxable * (taxCalc.igstRate / 100) * 100) / 100 : 0;
          const totalAmt = lineTaxable + cgstAmt + sgstAmt + igstAmt;

          await prisma.invoiceItem.create({
            data: {
              invoiceId: id,
              containerId: item.containerId || null,
              chargeMasterId: item.chargeMasterId || null,
              srNo: sr++,
              description: item.description,
              hsnSacCode: item.hsnSacCode || '996719',
              quantity: lineQty,
              unit: item.unit || 'PER_CONTAINER',
              rate: lineRate,
              amount: lineAmt,
              discount: lineDisc,
              taxableValue: lineTaxable,
              cgstRate: taxCalc.cgstRate,
              cgstAmount: cgstAmt,
              sgstRate: taxCalc.sgstRate,
              sgstAmount: sgstAmt,
              igstRate: taxCalc.igstRate,
              igstAmount: igstAmt,
              totalAmount: totalAmt,
            },
          });
        }
      }

      // Update containers if provided
      if (containers && Array.isArray(containers)) {
        await prisma.invoiceContainer.deleteMany({ where: { invoiceId: id } });
        for (const c of containers) {
          await prisma.invoiceContainer.create({
            data: {
              invoiceId: id,
              containerId: c.containerId || null,
              containerNumber: c.containerNumber,
              size: c.size || '20 FT',
              type: c.type || 'DRY',
              cartingDate: c.cartingDate ? new Date(c.cartingDate) : null,
              emptyGateInDate: c.emptyGateInDate ? new Date(c.emptyGateInDate) : null,
              stuffingDate: c.stuffingDate ? new Date(c.stuffingDate) : null,
              lddOutDate: c.lddOutDate ? new Date(c.lddOutDate) : null,
              emptyGroundDays: Number(c.emptyGroundDays || c.emptyGroundRentDays || 0),
              daysAfterCarting: Number(c.daysAfterCarting || 0),
              loadedGroundDays: Number(c.loadedGroundDays || 0),
              htCharges: Number(c.htCharges || 0),
              logisticsCharges: Number(c.logisticsCharges || 0),
              emptyTransportCharges: Number(c.emptyTransportCharges || 0),
            },
          });
        }
      }

      const updated = await prisma.invoice.update({
        where: { id },
        data: updateData,
        include: { items: true, containers: true },
      });

      await logAudit({
        action: 'UPDATE',
        entityType: 'INVOICE',
        entityId: id,
        details: `Updated invoice ${updated.invoiceNumber}`,
        oldValues: existing,
        newValues: updated,
        req,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async finalize(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      if (invoice.status === 'FINALIZED') {
        return res.status(400).json({ error: 'Invoice is already finalized' });
      }

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'FINALIZED',
          finalizedAt: new Date(),
          finalizedBy: req.user?.name || 'Authorized User',
        },
      });

      const sym = updated.currency === 'USD' ? '$' : '₹';
      await logAudit({
        action: 'FINALIZE',
        entityType: 'INVOICE',
        entityId: id,
        details: `Finalized invoice ${updated.invoiceNumber} for ${sym}${updated.grandTotal}`,
        req,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async cancel(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason = 'Cancelled by user' } = req.body;
      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          balanceAmount: 0,
          notes: `${invoice.notes ? invoice.notes + '\n' : ''}[CANCELLED]: ${reason}`,
        },
      });

      await logAudit({
        action: 'CANCEL',
        entityType: 'INVOICE',
        entityId: id,
        details: `Cancelled invoice ${updated.invoiceNumber}. Reason: ${reason}`,
        req,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getPdf(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { templateId } = req.query;
      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      const pdfBuffer = await PDFService.generateInvoicePDF(id, undefined, {
        templateId: templateId ? String(templateId) : undefined,
      });

      const filename = `Invoice_${invoice.invoiceNumber.replace(/[\/\\]/g, '_')}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      return res.send(pdfBuffer);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async sendEmail(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        recipientEmail,
        recipientName,
        ccEmail,
        subject,
        customMessage,
        templateId = 'format-1',
      } = req.body;

      if (!recipientEmail || !String(recipientEmail).trim()) {
        return res.status(400).json({ error: 'Recipient email address is required.' });
      }

      const result = await EmailService.sendInvoiceEmail({
        invoiceId: id,
        recipientEmail: String(recipientEmail).trim(),
        recipientName: recipientName ? String(recipientName) : undefined,
        ccEmail: ccEmail ? String(ccEmail).trim() : undefined,
        subject: subject ? String(subject) : undefined,
        customMessage: customMessage ? String(customMessage) : undefined,
        templateId: String(templateId),
        userId: req.user?.id,
        userName: req.user?.name,
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to dispatch invoice email' });
    }
  }
}
