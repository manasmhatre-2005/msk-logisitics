import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { GSTService } from '../services/gstService.js';

export class PartyController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const search = (req.query.search as string || '').trim();
      const where: any = {};

      if (search) {
        where.OR = [
          { legalName: { contains: search } },
          { tradeName: { contains: search } },
          { gstin: { contains: search } },
          { city: { contains: search } },
          { contactPerson: { contains: search } },
        ];
      }

      const parties = await prisma.party.findMany({
        where,
        include: {
          _count: {
            select: { invoices: true, jobs: true, containers: true },
          },
          invoices: {
            select: { balanceAmount: true, grandTotal: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const enriched = parties.map((p) => {
        const totalBilled = p.invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
        const outstanding = p.invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);
        return {
          ...p,
          totalBilled,
          outstanding,
          invoicesCount: p._count.invoices,
          jobsCount: p._count.jobs,
          containersCount: p._count.containers,
        };
      });

      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const party = await prisma.party.findUnique({
        where: { id },
        include: {
          addresses: true,
          contacts: true,
          jobs: {
            include: { _count: { select: { containers: true } } },
            orderBy: { createdAt: 'desc' },
          },
          containers: {
            orderBy: { createdAt: 'desc' },
          },
          invoices: {
            orderBy: { invoiceDate: 'desc' },
          },
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
      });

      if (!party) {
        return res.status(404).json({ error: 'Party not found' });
      }

      const totalBilled = party.invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      const outstanding = party.invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

      return res.json({
        ...party,
        totalBilled,
        outstanding,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const {
        legalName,
        tradeName,
        gstin,
        gstStatus = 'Active',
        registeredAddress,
        billingAddress,
        shippingAddress,
        city,
        state,
        stateCode,
        pincode,
        contactPerson,
        mobile,
        email,
        vendorCode,
        notes,
        isGstVerified = false,
      } = req.body;

      if (!legalName || !gstin || !registeredAddress) {
        return res.status(400).json({ error: 'Legal Name, GSTIN, and Registered Address are required' });
      }

      const cleanGstin = gstin.trim().toUpperCase();

      // Check duplicate GSTIN
      const existing = await prisma.party.findUnique({ where: { gstin: cleanGstin } });
      if (existing) {
        return res.status(400).json({
          error: `Party with GSTIN ${cleanGstin} already exists (${existing.legalName}). Please use the existing party.`,
          existingPartyId: existing.id,
        });
      }

      const party = await prisma.party.create({
        data: {
          legalName,
          tradeName,
          gstin: cleanGstin,
          gstStatus,
          registeredAddress,
          billingAddress: billingAddress || registeredAddress,
          shippingAddress: shippingAddress || billingAddress || registeredAddress,
          city: city || 'Mumbai',
          state: state || 'Maharashtra',
          stateCode: stateCode || cleanGstin.substring(0, 2),
          pincode: pincode || '400001',
          contactPerson,
          mobile,
          email,
          vendorCode,
          notes,
          isGstVerified: Boolean(isGstVerified),
          gstVerifiedAt: isGstVerified ? new Date() : null,
          hasManualOverride: false,
        },
      });

      await logAudit({
        action: 'CREATE',
        entityType: 'PARTY',
        entityId: party.id,
        details: `Created new party: ${party.legalName} (${party.gstin})`,
        newValues: party,
        req,
      });

      return res.status(201).json(party);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const existing = await prisma.party.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Party not found' });
      }

      const data = { ...req.body };
      delete data.id;
      delete data.createdAt;
      delete data.updatedAt;

      // Mark as manual override if edited after verification
      if (existing.isGstVerified) {
        data.hasManualOverride = true;
      }

      const updated = await prisma.party.update({
        where: { id },
        data,
      });

      await logAudit({
        action: 'UPDATE',
        entityType: 'PARTY',
        entityId: id,
        details: `Updated party details for ${updated.legalName}`,
        oldValues: existing,
        newValues: updated,
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
      const invoiceCount = await prisma.invoice.count({ where: { partyId: id } });
      if (invoiceCount > 0) {
        return res.status(400).json({
          error: `Cannot delete party with ${invoiceCount} existing invoices. Deactivate or archive instead.`,
        });
      }

      const deleted = await prisma.party.delete({ where: { id } });
      await logAudit({
        action: 'DELETE',
        entityType: 'PARTY',
        entityId: id,
        details: `Deleted party ${deleted.legalName}`,
        req,
      });

      return res.json({ message: 'Party deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
