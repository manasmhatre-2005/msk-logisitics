import { Response, Request } from 'express';
import crypto from 'crypto';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { CalculationService } from '../services/calculationService.js';
import { PDFService } from '../services/pdfService.js';
import { EmailService } from '../services/emailService.js';
import { SequenceService } from '../services/sequenceService.js';
import { DocumentService } from '../services/documentService.js';

export class InvoiceController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const { status, partyId, dateFrom, dateTo, search, billType } = req.query;
      const where: any = {};

      if (status && status !== 'ALL') {
        if (status === 'CREDIT_NOTE') {
          where.billType = 'CREDIT_NOTE';
        } else if (status === 'HT_BILL') {
          where.billType = 'HT_BILL';
        } else if (status === 'EMPTY_CONTAINER') {
          where.billType = 'EMPTY_CONTAINER';
        } else {
          where.status = String(status);
        }
      }
      if (billType) {
        where.billType = String(billType);
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
          { originalInvoiceNumber: { contains: query } },
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

  static async getNextInvoiceNumber(req: AuthRequest, res: Response) {
    try {
      const { billType = 'STANDARD', invoiceDate } = req.query;
      const settings = await prisma.companySettings.findUnique({ where: { id: 'default' } });
      const d = invoiceDate ? new Date(String(invoiceDate)) : new Date();
      const nextNumber = await SequenceService.peekNextInvoiceNumber(
        String(billType),
        d,
        settings?.invoicePrefix
      );
      return res.json({ nextInvoiceNumber: nextNumber });
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
        billType = 'STANDARD',
        idempotencyKey: bodyIdempotencyKey,
        originalInvoiceId,
        originalInvoiceNumber,
        originalInvoiceDate,
        reasonForCredit,
        verificationToken,
        vesselVoyage,
        mblHbl,
        portOfLoading,
        portOfDischarge,
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

      // 1. Concurrency & Retry Idempotency: Prevent duplicate submissions
      const rawKey = (req.headers['idempotency-key'] as string) || bodyIdempotencyKey;
      const idempotencyKey = typeof rawKey === 'string' && rawKey.trim().length > 0 ? rawKey.trim() : null;

      if (idempotencyKey) {
        const existingInvoice = await prisma.invoice.findUnique({
          where: { idempotencyKey },
          include: {
            party: { select: { id: true, legalName: true, gstin: true } },
            job: { select: { id: true, jobNumber: true } },
            containers: true,
            items: { orderBy: { srNo: 'asc' } },
            payments: { orderBy: { paymentDate: 'desc' } },
          },
        });
        if (existingInvoice) {
          res.setHeader('Idempotent-Replay', 'true');
          return res.status(200).json(existingInvoice);
        }
      }

      if (!partyId) {
        return res.status(400).json({ error: 'Party is required to create an invoice' });
      }

      const party = await prisma.party.findUnique({ where: { id: partyId } });
      if (!party) {
        return res.status(404).json({ error: 'Party not found' });
      }

      const settings = await prisma.companySettings.findUnique({ where: { id: 'default' } });

      // Generate persistent secure verification token for QR code
      const token = verificationToken || crypto.randomBytes(16).toString('hex');

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

      const invDate = invoiceDate ? new Date(invoiceDate) : new Date();

      // Execute atomic transaction for sequence generation, invoice creation, containers, items, and credit-note balance update
      const invoice = await prisma.$transaction(async (tx) => {
        let invoiceNumber = customInvoiceNumber ? String(customInvoiceNumber).trim() : '';

        // Concurrency-safe atomic sequence generation
        if (!invoiceNumber) {
          invoiceNumber = await SequenceService.getNextInvoiceNumber(tx, billType, invDate, settings?.invoicePrefix);
        } else {
          // If custom invoice number supplied, ensure uniqueness
          const existing = await tx.invoice.findUnique({
            where: { invoiceNumber },
            select: { id: true },
          });
          if (existing) {
            throw new Error(`Invoice number "${invoiceNumber}" is already in use.`);
          }
        }

        // Prepare container records
        const containerRecords = containers.map((c: any) => ({
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
        }));

        // Prepare item records
        let sr = 1;
        const itemRecords = items.map((item: any) => {
          const lineQty = Number(item.quantity || 1);
          const lineRate = Number(item.rate || 0);
          const lineAmt = lineQty * lineRate;
          const lineDisc = Number(item.discount || 0);
          const lineTaxable = Math.max(0, lineAmt - lineDisc);

          const cgstAmt = taxCalc.isInterState ? 0 : Math.round(lineTaxable * (taxCalc.cgstRate / 100) * 100) / 100;
          const sgstAmt = taxCalc.isInterState ? 0 : Math.round(lineTaxable * (taxCalc.sgstRate / 100) * 100) / 100;
          const igstAmt = taxCalc.isInterState ? Math.round(lineTaxable * (taxCalc.igstRate / 100) * 100) / 100 : 0;
          const totalAmt = lineTaxable + cgstAmt + sgstAmt + igstAmt;

          return {
            containerId: item.containerId || null,
            containerNumber: item.containerNumber || null,
            containerSize: item.containerSize || null,
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
          };
        });

        // Atomic create
        const newInv = await tx.invoice.create({
          data: {
            idempotencyKey,
            invoiceNumber,
            billType,
            originalInvoiceId: originalInvoiceId || null,
            originalInvoiceNumber: originalInvoiceNumber || null,
            originalInvoiceDate: originalInvoiceDate ? new Date(originalInvoiceDate) : null,
            reasonForCredit: reasonForCredit || null,
            verificationToken: token,
            vesselVoyage: vesselVoyage || null,
            mblHbl: mblHbl || null,
            portOfLoading: portOfLoading || null,
            portOfDischarge: portOfDischarge || null,
            invoiceDate: invDate,
            dueDate: dueDate ? new Date(dueDate) : null,
            partyId,
            exporterId: exporterId || null,
            jobId: jobId || null,
            status,
            currency: currency || 'INR',
            billToName: party.legalName,
            billToGstin: party.gstin,
            billToAddress: party.billingAddress || party.registeredAddress || 'Maharashtra, India',
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
            containers: containerRecords.length > 0 ? { create: containerRecords } : undefined,
            items: itemRecords.length > 0 ? { create: itemRecords } : undefined,
          },
          include: {
            party: { select: { id: true, legalName: true, gstin: true } },
            job: { select: { id: true, jobNumber: true } },
            containers: true,
            items: { orderBy: { srNo: 'asc' } },
          },
        });

        // Atomic credit note adjustment on original invoice
        if (originalInvoiceId && billType === 'CREDIT_NOTE') {
          const origInv = await tx.invoice.findUnique({ where: { id: originalInvoiceId } });
          if (origInv) {
            const adjustedBalance = Math.max(0, origInv.balanceAmount - taxCalc.grandTotal);
            await tx.invoice.update({
              where: { id: originalInvoiceId },
              data: { balanceAmount: adjustedBalance },
            });
          }
        }

        return newInv;
      }, {
        maxWait: 10000,
        timeout: 20000,
      });

      // Background document archiving with checksum in durable storage
      setImmediate(async () => {
        try {
          const pdfBuffer = await PDFService.generateInvoicePDF(invoice.id);
          await DocumentService.saveInvoiceDocument(
            invoice.id,
            invoice.invoiceNumber,
            invoice.billType || 'STANDARD',
            pdfBuffer,
            { createdBy: req.user?.id, autoArchived: true }
          );
        } catch (pdfErr) {
          console.warn(`[DocumentService] Async PDF generation for ${invoice.invoiceNumber}:`, pdfErr);
        }
      });

      const sym = invoice.currency === 'USD' ? '$' : '₹';
      const docLabel = invoice.billType === 'CREDIT_NOTE' ? 'credit note' : 'invoice';
      await logAudit({
        action: 'CREATE',
        entityType: 'INVOICE',
        entityId: invoice.id,
        details: `Created ${docLabel} ${invoice.invoiceNumber} (${invoice.status}) for ${sym}${invoice.grandTotal}`,
        req,
      });

      return res.status(201).json(invoice);
    } catch (err: any) {
      console.error('Invoice create error:', err);
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

      let taxCalc: any = null;
      if (items && Array.isArray(items)) {
        taxCalc = await CalculationService.calculateInvoiceTaxes(
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
      }

      // Atomically update invoice header, replace items and containers in a single transaction
      const updated = await prisma.$transaction(async (tx) => {
        if (items && Array.isArray(items) && taxCalc) {
          await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
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

            await tx.invoiceItem.create({
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
          await tx.invoiceContainer.deleteMany({ where: { invoiceId: id } });
          for (const c of containers) {
            await tx.invoiceContainer.create({
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

        return tx.invoice.update({
          where: { id },
          data: updateData,
          include: { items: true, containers: true },
        });
      }, {
        maxWait: 10000,
        timeout: 20000,
      });

      // Background document re-archiving with checksum in durable storage
      setImmediate(async () => {
        try {
          const pdfBuffer = await PDFService.generateInvoicePDF(updated.id);
          await DocumentService.saveInvoiceDocument(
            updated.id,
            updated.invoiceNumber,
            updated.billType || 'STANDARD',
            pdfBuffer,
            { updatedBy: req.user?.id, autoUpdated: true }
          );
        } catch (pdfErr) {
          console.warn(`[DocumentService] Async PDF update for ${updated.invoiceNumber}:`, pdfErr);
        }
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

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { payments: true },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.payments && invoice.payments.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete invoice with recorded payments. Please void or cancel the payments first.',
        });
      }

      await prisma.$transaction([
        prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
        prisma.invoiceContainer.deleteMany({ where: { invoiceId: id } }),
        prisma.document.deleteMany({ where: { entityType: 'INVOICE', entityId: id } }),
        prisma.invoice.delete({ where: { id } }),
      ]);

      await logAudit({
        action: 'DELETE',
        entityType: 'INVOICE',
        entityId: id,
        details: `Deleted invoice ${invoice.invoiceNumber} (${invoice.status})`,
        req,
      });

      return res.json({ success: true, message: `Invoice ${invoice.invoiceNumber} deleted successfully` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getPdf(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { templateId, forceRegenerate, download } = req.query;
      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      let pdfBuffer: Buffer | null = null;

      // Check persistent document storage first if no template override and not forcing regeneration
      if (!forceRegenerate && !templateId) {
        const cached = await DocumentService.getInvoiceDocument(id);
        if (cached && cached.buffer) {
          pdfBuffer = cached.buffer;
        }
      }

      // Generate if not cached or regeneration explicitly requested
      if (!pdfBuffer) {
        pdfBuffer = await PDFService.generateInvoicePDF(id, undefined, {
          templateId: templateId ? String(templateId) : undefined,
        });

        // Store in durable document store with checksum
        try {
          await DocumentService.saveInvoiceDocument(
            invoice.id,
            invoice.invoiceNumber,
            invoice.billType || 'STANDARD',
            pdfBuffer,
            { requestedBy: req.user?.id, templateId: templateId || 'default' }
          );
        } catch (saveErr) {
          console.warn('[DocumentService] Caching PDF warning:', saveErr);
        }
      }

      const filename = `Invoice_${invoice.invoiceNumber.replace(/[\/\\]/g, '_')}.pdf`;
      const isDownload = download === '1' || download === 'true';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`);
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

  static async verifyCreditNote(req: Request, res: Response) {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(400).json({ verified: false, error: 'Verification token is required.' });
      }

      const invoice = await prisma.invoice.findFirst({
        where: { verificationToken: token },
        include: {
          party: true,
          items: {
            orderBy: { srNo: 'asc' },
          },
          containers: true,
        },
      });

      if (!invoice) {
        return res.status(404).json({
          verified: false,
          error: 'Credit Note record not found or verification token is invalid.',
        });
      }

      const settings = await prisma.companySettings.findUnique({ where: { id: 'default' } });

      return res.json({
        verified: true,
        id: invoice.id,
        creditNoteNumber: invoice.invoiceNumber,
        issueDate: invoice.invoiceDate,
        originalInvoiceNumber: invoice.originalInvoiceNumber,
        originalInvoiceDate: invoice.originalInvoiceDate,
        partyName: invoice.billToName,
        partyGstin: invoice.billToGstin,
        partyAddress: invoice.billToAddress,
        partyState: invoice.billToState,
        partyStateCode: invoice.billToStateCode,
        vesselVoyage: invoice.vesselVoyage,
        mblHbl: invoice.mblHbl,
        portOfLoading: invoice.portOfLoading,
        portOfDischarge: invoice.portOfDischarge,
        reasonForCredit: invoice.reasonForCredit,
        taxableAmount: invoice.taxableAmount,
        cgstRate: invoice.cgstRate,
        cgstAmount: invoice.cgstAmount,
        sgstRate: invoice.sgstRate,
        sgstAmount: invoice.sgstAmount,
        igstRate: invoice.igstRate,
        igstAmount: invoice.igstAmount,
        totalGst: invoice.totalGst,
        totalCreditValue: invoice.grandTotal,
        grandTotal: invoice.grandTotal,
        amountInWords: invoice.amountInWords,
        currency: invoice.currency,
        status: invoice.status,
        company: {
          name: settings?.companyName || 'MSK LOGISTIC SOLUTION',
          gstin: settings?.gstin || '27AXWPK4562G1ZX',
          city: settings?.city || 'Navi Mumbai',
        },
        companyName: settings?.companyName || 'MSK LOGISTIC SOLUTION',
        companyGstin: settings?.gstin || '27AXWPK4562G1ZX',
        companyPan: settings?.pan || 'AXWPK4562G',
        companyAddress: settings?.address || 'JNPT Township Colony, Sector - 3, Building No. B/48, Office No. 3, Navi Mumbai - 400702',
        companyPhone: settings?.phone || '+91 8104592823',
        companyEmail: settings?.email || 'accounts@msklogisticsolution.com',
        verificationTimestamp: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({ verified: false, error: err.message });
    }
  }

  static async verifyInvoice(req: Request, res: Response) {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(400).json({ verified: false, error: 'Verification token is required.' });
      }

      const invoice = await prisma.invoice.findFirst({
        where: { verificationToken: token },
        include: {
          party: true,
          items: {
            orderBy: { srNo: 'asc' },
          },
          containers: true,
        },
      });

      if (!invoice) {
        return res.status(404).json({
          verified: false,
          error: 'Invoice record not found or verification token is invalid.',
        });
      }

      const settings = await prisma.companySettings.findUnique({ where: { id: 'default' } });

      return res.json({
        verified: true,
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        billType: invoice.billType || 'HT_BILL',
        invoiceDate: invoice.invoiceDate,
        partyName: invoice.billToName,
        partyGstin: invoice.billToGstin,
        partyAddress: invoice.billToAddress,
        partyState: invoice.billToState,
        partyStateCode: invoice.billToStateCode,
        vesselVoyage: invoice.vesselVoyage,
        mblHbl: invoice.mblHbl,
        portOfLoading: invoice.portOfLoading,
        portOfDischarge: invoice.portOfDischarge,
        containersCount: invoice.containers.length,
        itemsCount: invoice.items.length,
        containers: invoice.containers.map((c) => ({
          containerNumber: c.containerNumber,
          size: c.size,
          type: c.type,
          emptyGateInDate: c.emptyGateInDate,
          stuffingDate: c.stuffingDate,
          cartingDate: c.cartingDate,
          lddOutDate: c.lddOutDate,
          emptyGroundDays: c.emptyGroundDays,
          daysAfterCarting: c.daysAfterCarting,
          loadedGroundDays: c.loadedGroundDays,
        })),
        items: invoice.items.map((i) => ({
          srNo: i.srNo,
          description: i.description,
          hsnSacCode: i.hsnSacCode,
          rate: i.rate,
          quantity: i.quantity,
          taxableValue: i.taxableValue,
        })),
        taxableAmount: invoice.taxableAmount,
        cgstRate: invoice.cgstRate,
        cgstAmount: invoice.cgstAmount,
        sgstRate: invoice.sgstRate,
        sgstAmount: invoice.sgstAmount,
        igstRate: invoice.igstRate,
        igstAmount: invoice.igstAmount,
        totalGst: invoice.totalGst,
        grandTotal: invoice.grandTotal,
        amountInWords: invoice.amountInWords,
        currency: invoice.currency,
        status: invoice.status,
        company: {
          name: settings?.companyName || 'MSK LOGISTIC SOLUTION',
          gstin: settings?.gstin || '27AXWPK4562G1ZX',
          city: settings?.city || 'Navi Mumbai',
        },
        companyName: settings?.companyName || 'MSK LOGISTIC SOLUTION',
        companyGstin: settings?.gstin || '27AXWPK4562G1ZX',
        companyPan: settings?.pan || 'AXWPK4562G',
        companyAddress: settings?.address || 'JNPT Township Colony, Sector - 3, Building No. B/48, Office No. 3, Navi Mumbai - 400702',
        companyPhone: settings?.phone || '+91 8104592823',
        companyEmail: settings?.email || 'accounts@msklogisticsolution.com',
        verificationTimestamp: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({ verified: false, error: err.message });
    }
  }
}
