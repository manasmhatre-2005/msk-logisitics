import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AIChatService } from '../services/aiChatService.js';

export class ChatController {
  static async message(req: AuthRequest, res: Response) {
    try {
      const { message, history = [] } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message content is required' });
      }

      const response = await AIChatService.processMessage(message, history);
      return res.json(response);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
