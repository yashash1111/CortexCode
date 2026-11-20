import { Request, Response } from 'express';
import { ConversationService } from '../services/conversation.service';

export class ConversationController {
  static async list(req: Request, res: Response) {
    try {
      const userId = req.user?.userId || 'default-user';
      const search = req.query.q as string;
      const grouped = await ConversationService.listConversations(userId, search);
      res.json({ success: true, data: grouped });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const userId = req.user?.userId || 'default-user';
      const { title, model } = req.body;
      const conv = await ConversationService.createConversation(userId, title, model);
      res.status(201).json({ success: true, data: conv });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async get(req: Request, res: Response) {
    try {
      const conv = await ConversationService.getConversation(req.params.id);
      if (!conv) {
        return res.status(404).json({ success: false, error: { message: 'Conversation not found' } });
      }
      res.json({ success: true, data: conv });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const conv = await ConversationService.updateConversation(req.params.id, req.body);
      if (!conv) {
        return res.status(404).json({ success: false, error: { message: 'Conversation not found' } });
      }
      res.json({ success: true, data: conv });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await ConversationService.deleteConversation(req.params.id);
      res.json({ success: true, data: { message: 'Conversation deleted' } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async sendMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { content, attachments, mode, userKeys: bodyKeys } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, error: { message: 'Message content required' } });
      }

      const userKeys = {
        gemini: (req.headers['x-gemini-api-key'] as string) || bodyKeys?.gemini,
        openai: (req.headers['x-openai-api-key'] as string) || bodyKeys?.openai,
        anthropic: (req.headers['x-anthropic-api-key'] as string) || bodyKeys?.anthropic
      };

      const result = await ConversationService.addMessage(id, 'user', content, attachments, mode || 'chat', userKeys);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }
}
