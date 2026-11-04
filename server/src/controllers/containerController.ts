import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { CalculationService } from '../services/calculationService.js';
import { invalidateDashboardCache } from './reportController.js';

export class ContainerController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const { search, partyId, jobId, status } = req.query;
      const where: any = {};
      if (partyId) where.partyId = String(partyId);
      if (jobId) where.jobId = String(jobId);
      if (status) where.status = String(status);
      if (search) {
        where.containerNumber = { contains: String(search).trim().toUpperCase() };
      }

      const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 500) : 250;
      const page = req.query.page ? Math.max(Number(req.query.page), 1) : 1;
      const skip = req.query.page ? (page - 1) * limit : undefined;

      const containers = await prisma.container.findMany({
        where,
        take: limit,
        ...(skip !== undefined ? { skip } : {}),
        include: {
          party: { select: { id: true, legalName: true, gstin: true } },
          job: { select: { id: true, jobNumber: true, port: true } },
          exporter: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(containers);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const container = await prisma.container.findUnique({
        where: { id },
        include: {
          party: true,
          job: true,
          exporter: true,
          invoiceContainers: {
            include: { invoice: true },
          },
        },
      });

      if (!container) return res.status(404).json({ error: 'Container not found' });
      return res.json(container);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async calculateDates(req: AuthRequest, res: Response) {
    try {
      const { cartingDate, emptyGateInDate, stuffingDate, lddOutDate, emptyGroundRentDays, daysAfterCarting, loadedGroundDays, isOverride } = req.body;
      const result = await CalculationService.calculateContainerDays(
        cartingDate,
        emptyGateInDate,
        stuffingDate,
        lddOutDate,
        emptyGroundRentDays,
        daysAfterCarting,
        loadedGroundDays,
        isOverride
      );
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const {
        containerNumber,
        size = '20 FT',
        type = 'DRY',
        partyId,
        jobId,
        exporterId,
        cartingDate,
        emptyGateInDate,
        stuffingDate,
        lddOutDate,
        isOverride = false,
        overrideReason,
        emptyGroundRentDays,
        daysAfterCarting,
        loadedGroundDays,
        htCharges = 0,
        logisticsCharges = 0,
        emptyTransportCharges = 0,
        otherCharges = 0,
        status = 'ACTIVE',
        remarks,
      } = req.body;

      if (!containerNumber || !partyId) {
        return res.status(400).json({ error: 'Container Number and Party ID are required' });
      }

      const cleanCNum = containerNumber.trim().toUpperCase();

      const existing = await prisma.container.findUnique({ where: { containerNumber: cleanCNum } });
      if (existing) {
        return res.status(400).json({ error: `Container ${cleanCNum} already exists in system.` });
      }

      // Compute automatic days if not overridden
      const daysCalc = await CalculationService.calculateContainerDays(
        cartingDate,
        emptyGateInDate,
        stuffingDate,
        lddOutDate,
        emptyGroundRentDays,
        daysAfterCarting,
        loadedGroundDays,
        isOverride
      );

      const container = await prisma.container.create({
        data: {
          containerNumber: cleanCNum,
          size,
          type,
          partyId,
          jobId,
          exporterId,
          cartingDate: cartingDate ? new Date(cartingDate) : null,
          emptyGateInDate: emptyGateInDate ? new Date(emptyGateInDate) : null,
          stuffingDate: stuffingDate ? new Date(stuffingDate) : null,
          lddOutDate: lddOutDate ? new Date(lddOutDate) : null,
          emptyGroundRentDays: daysCalc.emptyGroundRentDays,
          daysAfterCarting: daysCalc.daysAfterCarting,
          loadedGroundDays: daysCalc.loadedGroundDays,
          isOverride: Boolean(isOverride),
          overrideReason,
          htCharges: Number(htCharges || 0),
          logisticsCharges: Number(logisticsCharges || 0),
          emptyTransportCharges: Number(emptyTransportCharges || 0),
          otherCharges: Number(otherCharges || 0),
          status,
          remarks,
        },
        include: { party: true, job: true, exporter: true },
      });

      await logAudit({
        action: 'CREATE',
        entityType: 'CONTAINER',
        entityId: container.id,
        details: `Registered container ${container.containerNumber} (${container.size})`,
        req,
      });

      invalidateDashboardCache();
      return res.status(201).json(container);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const existing = await prisma.container.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Container not found' });

      const data = { ...req.body };
      delete data.id;
      delete data.createdAt;
      delete data.updatedAt;

      if (data.cartingDate) data.cartingDate = new Date(data.cartingDate);
      if (data.emptyGateInDate) data.emptyGateInDate = new Date(data.emptyGateInDate);
      if (data.stuffingDate) data.stuffingDate = new Date(data.stuffingDate);
      if (data.lddOutDate) data.lddOutDate = new Date(data.lddOutDate);

      // Re-calculate days if dates were updated and not overridden
      if (!data.isOverride && (data.cartingDate || data.emptyGateInDate || data.stuffingDate || data.lddOutDate)) {
        const daysCalc = await CalculationService.calculateContainerDays(
          data.cartingDate || existing.cartingDate,
          data.emptyGateInDate || existing.emptyGateInDate,
          data.stuffingDate || existing.stuffingDate,
          data.lddOutDate || existing.lddOutDate,
          data.emptyGroundRentDays,
          data.daysAfterCarting,
          data.loadedGroundDays,
          false
        );
        data.emptyGroundRentDays = daysCalc.emptyGroundRentDays;
        data.daysAfterCarting = daysCalc.daysAfterCarting;
        data.loadedGroundDays = daysCalc.loadedGroundDays;
      }

      const updated = await prisma.container.update({
        where: { id },
        data,
        include: { party: true, job: true, exporter: true },
      });

      await logAudit({
        action: data.isOverride ? 'OVERRIDE' : 'UPDATE',
        entityType: 'CONTAINER',
        entityId: id,
        details: `Updated container ${updated.containerNumber}${data.isOverride ? ' (Manual Date Override)' : ''}`,
        oldValues: existing,
        newValues: updated,
        req,
      });

      invalidateDashboardCache();
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const container = await prisma.container.findUnique({ where: { id } });
      if (!container) return res.status(404).json({ error: 'Container not found' });

      await prisma.container.delete({ where: { id } });

      await logAudit({
        action: 'DELETE',
        entityType: 'CONTAINER',
        entityId: id,
        details: `Deleted container ${container.containerNumber}`,
        req,
      });

      invalidateDashboardCache();
      return res.json({ message: 'Container deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
