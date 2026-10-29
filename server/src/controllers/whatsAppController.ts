import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { WhatsAppService } from '../services/whatsAppService.js';
import { config } from '../config/index.js';

export class WhatsAppController {
  static async sendMessage(req: AuthRequest, res: Response) {
    try {
      const { recipientPhone, recipientName, invoiceId, messageType, templateName, parameters, customText } = req.body;
      if (!recipientPhone) {
        return res.status(400).json({ error: 'Recipient phone number is required' });
      }

      const result = await WhatsAppService.sendMessage({
        recipientPhone,
        recipientName,
        invoiceId,
        messageType,
        templateName,
        parameters,
        customText,
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async listMessages(req: AuthRequest, res: Response) {
    try {
      const messages = await prisma.whatsAppMessage.findMany({
        orderBy: { sentAt: 'desc' },
        include: {
          invoice: { select: { invoiceNumber: true, grandTotal: true } },
        },
        take: 50,
      });
      return res.json(messages);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async listTemplates(req: AuthRequest, res: Response) {
    try {
      const templates = await prisma.whatsAppTemplate.findMany({
        where: { isActive: true },
        orderBy: { templateName: 'asc' },
      });
      return res.json(templates);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async testConnection(req: AuthRequest, res: Response) {
    try {
      const result = await WhatsAppService.testConnection();
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async webhookGet(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  static async webhookPost(req: Request, res: Response) {
    try {
      const body = req.body;
      if (body.entry && body.entry[0]?.changes && body.entry[0]?.changes[0]?.value?.statuses) {
        const statusObj = body.entry[0].changes[0].value.statuses[0];
        const externalId = statusObj.id;
        const newStatus = statusObj.status?.toUpperCase();

        if (externalId && newStatus) {
          await prisma.whatsAppMessage.updateMany({
            where: { externalMessageId: externalId },
            data: { status: newStatus },
          });
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    } catch (e) {
      return res.status(200).send('EVENT_RECEIVED');
    }
  }
}
