import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../prisma.js';
import { logAudit } from '../middleware/audit.js';
import { EmailService } from '../services/emailService.js';

// Pre-approved common shipping lines serving Nhava Sheva (JNPT)
const STANDARD_SHIPPING_LINES = [
  'MAERSK LINE',
  'MSC (MEDITERRANEAN SHIPPING CO)',
  'CMA CGM',
  'HAPAG-LLOYD',
  'ONE (OCEAN NETWORK EXPRESS)',
  'COSCO SHIPPING',
  'EVERGREEN MARINE',
  'YANG MING',
  'ZIM INTEGRATED SHIPPING',
  'WAN HAI LINES',
  'HYUNDAI MERCHANT MARINE (HMM)',
  'PIL (PACIFIC INTERNATIONAL LINES)',
  'KMTC (KOREA MARINE TRANSPORT)',
  'OOCL',
  'SAMUDERA SHIPPING',
  'EMIRATES SHIPPING LINE',
];

const CONTAINER_TYPES = ['DRY', 'REEFER', 'OPEN_TOP', 'FLAT_RACK', 'TANK'];
const CONTAINER_SIZES = ['20 FT', '40 FT'];

export class DataEntryController {
  /**
   * Reference data for dropdowns / autocompletes
   * STRICTLY OPERATIONAL — NEVER EXPOSES FINANCIAL, GST, OR BANK DETAILS
   */
  static async getReferenceData(_req: AuthRequest, res: Response): Promise<void> {
    try {
      // Fetch existing exporter names
      const exporters = await prisma.exporter.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

      res.json({
        containerSizes: CONTAINER_SIZES,
        containerTypes: CONTAINER_TYPES,
        movementTypes: ['IN', 'OUT'],
        operationTypes: ['STUFFING', 'CARTING', 'CARTING_AND_STUFFING'],
        shippingLines: STANDARD_SHIPPING_LINES,
        exporters: exporters.map((e) => ({ id: e.id, name: e.name })),
      });
    } catch (err: any) {
      console.error('Failed to get reference data:', err);
      res.status(500).json({ error: 'Unable to retrieve operational reference data.' });
    }
  }

  /**
   * Create a new Data Entry Record
   */
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const {
        operationType = 'STUFFING',
        operationDate,
        containerType = 'DRY',
        containerSize = '20 FT',
        containerNumber,
        sealNumber,
        movementType = 'IN',
        shippingLine,
        exporterName,
        exporterId,
        remarks,
      } = req.body;

      // Validate required operational fields
      if (!containerNumber || !containerNumber.trim()) {
        res.status(400).json({ error: 'Container number is required.' });
        return;
      }

      const cleanContainerNumber = containerNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleanContainerNumber.length < 7 || cleanContainerNumber.length > 15) {
        res.status(400).json({
          error: 'Invalid container number format. Must be between 7 and 15 alphanumeric characters (e.g., MSKU1234567).',
        });
        return;
      }

      if (!sealNumber || !sealNumber.trim()) {
        res.status(400).json({ error: 'Seal number (SED / Seal No.) is required.' });
        return;
      }

      if (!shippingLine || !shippingLine.trim()) {
        res.status(400).json({ error: 'Shipping line is required.' });
        return;
      }

      if (!exporterName || !exporterName.trim()) {
        res.status(400).json({ error: 'Exporter name is required.' });
        return;
      }

      if (!['20 FT', '40 FT'].includes(containerSize)) {
        res.status(400).json({ error: 'Container size must be either 20 FT or 40 FT.' });
        return;
      }

      if (!['IN', 'OUT'].includes(movementType)) {
        res.status(400).json({ error: 'Movement type must be IN or OUT.' });
        return;
      }

      // Generate sequence entry number: ENT-YYYY-XXXX
      const currentYear = new Date().getFullYear();
      const countThisYear = await prisma.dataEntryRecord.count({
        where: {
          createdAt: {
            gte: new Date(`${currentYear}-01-01T00:00:00Z`),
          },
        },
      });
      const entryNumber = `ENT-${currentYear}-${String(countThisYear + 1).padStart(4, '0')}`;

      // Prevent accidental double submission within 30 seconds for the same container & movement
      const recentDuplicate = await prisma.dataEntryRecord.findFirst({
        where: {
          containerNumber: cleanContainerNumber,
          movementType,
          createdById: req.user.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 1000), // last 30 seconds
          },
        },
      });

      if (recentDuplicate) {
        res.status(409).json({
          error: `Accidental double submission detected. Container ${cleanContainerNumber} was just submitted moments ago (${recentDuplicate.entryNumber}).`,
          existingEntry: recentDuplicate,
        });
        return;
      }

      // Safe exporter reference linking
      let matchedExporterId = exporterId || null;
      if (!matchedExporterId) {
        const foundExporter = await prisma.exporter.findFirst({
          where: { name: { equals: exporterName.trim(), mode: 'insensitive' } },
          select: { id: true },
        });
        if (foundExporter) matchedExporterId = foundExporter.id;
      }

      const parsedDate = operationDate ? new Date(operationDate) : new Date();

      // Create permanent Data Entry Record
      const record = await prisma.dataEntryRecord.create({
        data: {
          entryNumber,
          operationType: ['CARTING', 'STUFFING', 'CARTING_AND_STUFFING'].includes(operationType)
            ? operationType
            : 'STUFFING',
          operationDate: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
          containerType: CONTAINER_TYPES.includes(containerType.toUpperCase())
            ? containerType.toUpperCase()
            : 'DRY',
          containerSize,
          containerNumber: cleanContainerNumber,
          sealNumber: sealNumber.trim(),
          movementType,
          shippingLine: shippingLine.trim().toUpperCase(),
          exporterName: exporterName.trim(),
          exporterId: matchedExporterId,
          remarks: remarks?.trim() || null,
          createdById: req.user.id,
          createdByName: req.user.name || req.user.email,
        },
      });

      // Synchronize container operational status with Container table
      // (ensures container master remains up-to-date for operational visibility)
      try {
        const defaultParty = await prisma.party.findFirst({ select: { id: true } });
        if (defaultParty) {
          const containerStatus = movementType === 'IN'
            ? (operationType === 'CARTING' ? 'CARTING' : 'GATE_IN')
            : 'LDD_OUT';

          await prisma.container.upsert({
            where: { containerNumber: cleanContainerNumber },
            update: {
              size: containerSize,
              type: record.containerType,
              status: containerStatus,
              exporterId: matchedExporterId,
              stuffingDate: operationType === 'STUFFING' ? record.operationDate : undefined,
              cartingDate: operationType === 'CARTING' ? record.operationDate : undefined,
              lddOutDate: movementType === 'OUT' ? record.operationDate : undefined,
            },
            create: {
              containerNumber: cleanContainerNumber,
              size: containerSize,
              type: record.containerType,
              partyId: defaultParty.id,
              exporterId: matchedExporterId,
              status: containerStatus,
              stuffingDate: operationType === 'STUFFING' ? record.operationDate : undefined,
              cartingDate: operationType === 'CARTING' ? record.operationDate : undefined,
              lddOutDate: movementType === 'OUT' ? record.operationDate : undefined,
            },
          });
        }
      } catch (syncErr: any) {
        console.warn('Non-blocking container sync warning:', syncErr.message);
      }

      await logAudit({
        action: 'CREATE',
        entityType: 'DATA_ENTRY_RECORD',
        entityId: record.id,
        details: `Saved entry ${record.entryNumber} for container ${record.containerNumber} (${movementType} - ${record.operationType})`,
        userId: req.user.id,
        userName: req.user.name,
      });

      res.status(201).json({
        success: true,
        message: `Operational entry ${record.entryNumber} recorded successfully.`,
        record,
      });
    } catch (err: any) {
      console.error('Data entry creation error:', err);
      res.status(500).json({ error: 'Failed to save data entry record: ' + err.message });
    }
  }

  /**
   * List entries with role-based isolation, search, filtering, and pagination
   */
  static async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const {
        search,
        size,
        movement,
        operationType,
        shippingLine,
        startDate,
        endDate,
        page = '1',
        limit = '50',
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      // STRICT ROLE FILTER: Data Entry Operators ONLY see their own entries
      const where: any = {};
      if (req.user.role === 'DATA_ENTRY') {
        where.createdById = req.user.id;
      }

      if (search && typeof search === 'string' && search.trim()) {
        const query = search.trim();
        where.OR = [
          { containerNumber: { contains: query, mode: 'insensitive' } },
          { entryNumber: { contains: query, mode: 'insensitive' } },
          { exporterName: { contains: query, mode: 'insensitive' } },
          { shippingLine: { contains: query, mode: 'insensitive' } },
          { sealNumber: { contains: query, mode: 'insensitive' } },
        ];
      }

      if (size && typeof size === 'string') {
        where.containerSize = size;
      }

      if (movement && typeof movement === 'string') {
        where.movementType = movement.toUpperCase();
      }

      if (operationType && typeof operationType === 'string') {
        where.operationType = operationType.toUpperCase();
      }

      if (shippingLine && typeof shippingLine === 'string') {
        where.shippingLine = { contains: shippingLine, mode: 'insensitive' };
      }

      if (startDate || endDate) {
        where.operationDate = {};
        if (startDate) where.operationDate.gte = new Date(startDate as string);
        if (endDate) where.operationDate.lte = new Date(endDate as string);
      }

      const [records, total] = await Promise.all([
        prisma.dataEntryRecord.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.dataEntryRecord.count({ where }),
      ]);

      res.json({
        records,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (err: any) {
      console.error('Failed to list data entries:', err);
      res.status(500).json({ error: 'Failed to retrieve data entry records.' });
    }
  }

  /**
   * Retrieve single record by ID with authorization check
   */
  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const record = await prisma.dataEntryRecord.findUnique({
        where: { id },
      });

      if (!record) {
        res.status(404).json({ error: 'Entry record not found.' });
        return;
      }

      // Role authorization: Data Entry Operator cannot access records created by others
      if (req.user.role === 'DATA_ENTRY' && record.createdById !== req.user.id) {
        res.status(403).json({ error: 'Access denied: You are not authorized to view this record.' });
        return;
      }

      res.json(record);
    } catch (err: any) {
      console.error('Get entry error:', err);
      res.status(500).json({ error: 'Failed to fetch entry details.' });
    }
  }

  /**
   * Update record with concurrency check (version) and audit
   */
  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const existing = await prisma.dataEntryRecord.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ error: 'Record not found.' });
        return;
      }

      // Check authorization
      if (req.user.role === 'DATA_ENTRY' && existing.createdById !== req.user.id) {
        res.status(403).json({ error: 'Access denied: You cannot edit records created by another user.' });
        return;
      }

      const {
        operationType,
        operationDate,
        containerType,
        containerSize,
        containerNumber,
        sealNumber,
        movementType,
        shippingLine,
        exporterName,
        remarks,
        version,
      } = req.body;

      // Concurrency check
      if (version !== undefined && existing.version !== Number(version)) {
        res.status(409).json({
          error: 'Concurrency conflict: This entry was modified by another action. Please reload to see latest data.',
          currentVersion: existing.version,
        });
        return;
      }

      const cleanContainerNumber = containerNumber
        ? containerNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
        : existing.containerNumber;

      const updated = await prisma.dataEntryRecord.update({
        where: { id },
        data: {
          operationType: operationType || existing.operationType,
          operationDate: operationDate ? new Date(operationDate) : existing.operationDate,
          containerType: containerType ? containerType.toUpperCase() : existing.containerType,
          containerSize: containerSize || existing.containerSize,
          containerNumber: cleanContainerNumber,
          sealNumber: sealNumber ? sealNumber.trim() : existing.sealNumber,
          movementType: movementType ? movementType.toUpperCase() : existing.movementType,
          shippingLine: shippingLine ? shippingLine.trim().toUpperCase() : existing.shippingLine,
          exporterName: exporterName ? exporterName.trim() : existing.exporterName,
          remarks: remarks !== undefined ? (remarks ? remarks.trim() : null) : existing.remarks,
          version: { increment: 1 },
          updatedById: req.user.id,
          updatedByName: req.user.name || req.user.email,
        },
      });

      await logAudit({
        action: 'UPDATE',
        entityType: 'DATA_ENTRY_RECORD',
        entityId: updated.id,
        details: `Updated entry ${updated.entryNumber} (version ${updated.version})`,
        userId: req.user.id,
        userName: req.user.name,
      });

      res.json({
        success: true,
        message: `Entry ${updated.entryNumber} updated successfully.`,
        record: updated,
      });
    } catch (err: any) {
      console.error('Update entry error:', err);
      res.status(500).json({ error: 'Failed to update entry: ' + err.message });
    }
  }

  /**
   * Delete entry with validation and invoice-safety checks
   */
  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const existing = await prisma.dataEntryRecord.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ error: 'Record not found.' });
        return;
      }

      // Check ownership
      if (req.user.role === 'DATA_ENTRY' && existing.createdById !== req.user.id) {
        res.status(403).json({ error: 'Access denied: You can only delete entries created by you.' });
        return;
      }

      // Prevent unsafe deletion if linked container is already used in an invoice
      const linkedContainer = await prisma.container.findUnique({
        where: { containerNumber: existing.containerNumber },
        include: { invoiceContainers: true },
      });

      if (linkedContainer && linkedContainer.invoiceContainers.length > 0) {
        res.status(400).json({
          error: `Cannot delete entry: Container ${existing.containerNumber} is already referenced by ${linkedContainer.invoiceContainers.length} billing invoice(s).`,
        });
        return;
      }

      await prisma.dataEntryRecord.delete({ where: { id } });

      await logAudit({
        action: 'DELETE',
        entityType: 'DATA_ENTRY_RECORD',
        entityId: id,
        details: `Deleted entry ${existing.entryNumber} (${existing.containerNumber})`,
        userId: req.user.id,
        userName: req.user.name,
      });

      res.json({
        success: true,
        message: `Entry ${existing.entryNumber} has been safely deleted.`,
      });
    } catch (err: any) {
      console.error('Delete entry error:', err);
      res.status(500).json({ error: 'Failed to delete entry: ' + err.message });
    }
  }

  /**
   * Export authorized records to CSV (STRICTLY OPERATIONAL DATA)
   */
  static async exportCsv(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { search, size, movement, operationType, shippingLine, startDate, endDate } = req.query;

      const where: any = {};
      if (req.user.role === 'DATA_ENTRY') {
        where.createdById = req.user.id;
      }

      if (search && typeof search === 'string' && search.trim()) {
        const query = search.trim();
        where.OR = [
          { containerNumber: { contains: query, mode: 'insensitive' } },
          { entryNumber: { contains: query, mode: 'insensitive' } },
          { exporterName: { contains: query, mode: 'insensitive' } },
          { shippingLine: { contains: query, mode: 'insensitive' } },
          { sealNumber: { contains: query, mode: 'insensitive' } },
        ];
      }

      if (size && typeof size === 'string') where.containerSize = size;
      if (movement && typeof movement === 'string') where.movementType = movement.toUpperCase();
      if (operationType && typeof operationType === 'string') where.operationType = operationType.toUpperCase();
      if (shippingLine && typeof shippingLine === 'string') {
        where.shippingLine = { contains: shippingLine, mode: 'insensitive' };
      }
      if (startDate || endDate) {
        where.operationDate = {};
        if (startDate) where.operationDate.gte = new Date(startDate as string);
        if (endDate) where.operationDate.lte = new Date(endDate as string);
      }

      const records = await prisma.dataEntryRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 2000,
      });

      // Escape CSV value
      const escape = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const headers = [
        'Entry Ref',
        'Date',
        'Container Number',
        'Size',
        'Type',
        'Movement',
        'Activity / Operation',
        'Seal Number',
        'Shipping Line',
        'Exporter',
        'Status',
        'Created By',
        'Created At',
      ];

      const rows = records.map((r) => [
        escape(r.entryNumber),
        escape(new Date(r.operationDate).toISOString().split('T')[0]),
        escape(r.containerNumber),
        escape(r.containerSize),
        escape(r.containerType),
        escape(r.movementType),
        escape(r.operationType),
        escape(r.sealNumber),
        escape(r.shippingLine),
        escape(r.exporterName),
        escape(r.status),
        escape(r.createdByName),
        escape(r.createdAt.toISOString()),
      ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

      await logAudit({
        action: 'UPDATE',
        entityType: 'DATA_ENTRY_RECORD',
        entityId: 'BULK_CSV',
        details: `Exported ${records.length} operational data entry records to CSV`,
        userId: req.user.id,
        userName: req.user.name,
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="msk-data-entries-${new Date().toISOString().split('T')[0]}.csv"`
      );
      res.status(200).send(csvContent);
    } catch (err: any) {
      console.error('CSV export error:', err);
      res.status(500).json({ error: 'Failed to export records to CSV.' });
    }
  }

  /**
   * Send single entry operational summary by Email
   */
  static async sendEmail(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const { recipientEmail, customNote } = req.body;

      if (!recipientEmail || !recipientEmail.trim()) {
        res.status(400).json({ error: 'Recipient email address is required.' });
        return;
      }

      const record = await prisma.dataEntryRecord.findUnique({ where: { id } });
      if (!record) {
        res.status(404).json({ error: 'Record not found.' });
        return;
      }

      // Check ownership for Data Entry Operators
      if (req.user.role === 'DATA_ENTRY' && record.createdById !== req.user.id) {
        res.status(403).json({ error: 'Access denied: You can only email entries recorded by you.' });
        return;
      }

      const result = await EmailService.sendOperationEntryEmail({
        entry: record,
        recipientEmail,
        customNote,
        userId: req.user.id,
        userName: req.user.name || req.user.email,
      });

      // Update record email statistics
      await prisma.dataEntryRecord.update({
        where: { id },
        data: {
          emailSentCount: { increment: 1 },
          lastEmailSentAt: new Date(),
          lastEmailRecipient: recipientEmail.trim(),
        },
      });

      res.json({
        success: true,
        message: `Operational entry ${record.entryNumber} emailed successfully to ${recipientEmail.trim()}`,
        deliveryDetails: result,
      });
    } catch (err: any) {
      console.error('Send entry email error:', err);
      res.status(500).json({ error: 'Failed to send entry by email: ' + err.message });
    }
  }
}
