import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { JobSequenceService, JobFormatType, JOB_FORMATS } from '../services/jobSequenceService.js';

export class JobController {
  /**
   * Preview next job number without allocating or incrementing
   */
  static async getNextNumber(req: AuthRequest, res: Response) {
    try {
      const formatType = (req.query.formatType as JobFormatType) || 'FORMAT_1';
      const validFormats: JobFormatType[] = ['FORMAT_1', 'FORMAT_2', 'FORMAT_3'];
      if (!validFormats.includes(formatType)) {
        return res.status(400).json({
          error: `Invalid formatType. Must be one of: ${validFormats.join(', ')}`,
        });
      }

      const dateStr = req.query.date as string | undefined;
      const date = dateStr ? new Date(dateStr) : new Date();

      const result = await JobSequenceService.peekNextJobNumber(formatType, date);
      return res.json({
        ...result,
        formats: JOB_FORMATS,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getAll(req: AuthRequest, res: Response) {
    try {
      const { status, partyId, search } = req.query;
      const where: any = {};
      if (status) where.status = String(status);
      if (partyId) where.partyId = String(partyId);

      if (search) {
        const q = String(search).trim();
        where.OR = [
          { jobNumber: { contains: q, mode: 'insensitive' } },
          { sbNumber: { contains: q, mode: 'insensitive' } },
          { bookingDetails: { contains: q, mode: 'insensitive' } },
          { destination: { contains: q, mode: 'insensitive' } },
          { port: { contains: q, mode: 'insensitive' } },
          { shipmentRef: { contains: q, mode: 'insensitive' } },
          { party: { legalName: { contains: q, mode: 'insensitive' } } },
          { exporter: { name: { contains: q, mode: 'insensitive' } } },
        ];
      }

      const jobs = await prisma.job.findMany({
        where,
        include: {
          party: { select: { id: true, legalName: true, gstin: true } },
          exporter: { select: { id: true, name: true } },
          containers: true,
          _count: { select: { containers: true, invoices: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(jobs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const job = await prisma.job.findUnique({
        where: { id },
        include: {
          party: true,
          exporter: true,
          containers: true,
          invoices: true,
        },
      });

      if (!job) return res.status(404).json({ error: 'Job not found' });
      return res.json(job);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const {
        partyId,
        exporterId,
        sbNumber,
        bookingDetails,
        shipmentRef,
        shipmentDate,
        port = 'Nhava Sheva (JNPT)',
        destination,
        remarks,
        status = 'ACTIVE',
        formatType = 'FORMAT_1',
      } = req.body;

      if (!partyId) {
        return res.status(400).json({ error: 'Party ID is required' });
      }

      const dateObj = shipmentDate ? new Date(shipmentDate) : new Date();

      // Concurrency-safe atomic job creation inside database transaction
      const job = await prisma.$transaction(async (tx) => {
        let assignedJobNumber = (req.body.jobNumber || '').trim();

        if (!assignedJobNumber || assignedJobNumber === 'AUTO') {
          // Atomically allocate the next sequence number from JobSequence table
          const seqResult = await JobSequenceService.getNextJobNumber(
            tx,
            formatType as JobFormatType,
            dateObj
          );
          assignedJobNumber = seqResult.jobNumber;
        } else {
          // If custom job number was passed, ensure uniqueness
          const existing = await tx.job.findUnique({
            where: { jobNumber: assignedJobNumber },
          });
          if (existing) {
            throw new Error(`Job Number "${assignedJobNumber}" already exists.`);
          }
        }

        return tx.job.create({
          data: {
            jobNumber: assignedJobNumber,
            formatType: formatType || 'FORMAT_1',
            partyId,
            exporterId: exporterId || null,
            sbNumber,
            bookingDetails,
            shipmentRef,
            shipmentDate: shipmentDate ? new Date(shipmentDate) : null,
            port,
            destination,
            remarks,
            status,
          },
          include: {
            party: true,
            exporter: true,
          },
        });
      });

      await logAudit({
        action: 'CREATE',
        entityType: 'JOB',
        entityId: job.id,
        details: `Created Job: ${job.jobNumber} for ${job.party.legalName}`,
        req,
      });

      return res.status(201).json(job);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = { ...req.body };
      delete data.id;
      if (data.shipmentDate) data.shipmentDate = new Date(data.shipmentDate);

      const existingJob = await prisma.job.findUnique({
        where: { id },
        include: { party: true },
      });
      if (!existingJob) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Job numbers should be immutable after assignment by default.
      // If an exceptional correction is necessary, restrict it to authorized Admin users and maintain an audit trail.
      if (data.jobNumber && data.jobNumber !== existingJob.jobNumber) {
        if (req.user?.role !== 'ADMIN') {
          return res.status(403).json({
            error: 'Job numbers are immutable after creation. Only Administrators can modify assigned job numbers.',
          });
        }

        // Check if the new job number is already taken
        const duplicate = await prisma.job.findUnique({
          where: { jobNumber: data.jobNumber },
        });
        if (duplicate && duplicate.id !== id) {
          return res.status(400).json({
            error: `Job number "${data.jobNumber}" is already assigned to another job.`,
          });
        }

        await logAudit({
          action: 'UPDATE',
          entityType: 'JOB',
          entityId: id,
          details: `Admin ${req.user?.name || req.user?.email} modified Job Number from "${existingJob.jobNumber}" to "${data.jobNumber}"`,
          req,
        });
      }

      const updated = await prisma.job.update({
        where: { id },
        data,
        include: { party: true, exporter: true, containers: true },
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.job.delete({ where: { id } });
      return res.json({ message: 'Job deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
