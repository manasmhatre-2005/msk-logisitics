import { Request, Response } from 'express';
import { GSTService } from '../services/gstService.js';

export class GSTController {
  static async lookup(req: Request, res: Response) {
    try {
      const gstin = (req.body.gstin || req.query.gstin || '') as string;
      if (!gstin) {
        return res.status(400).json({ error: 'GSTIN is required' });
      }

      const result = await GSTService.lookupGSTIN(gstin);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}
