import { Request, Response } from 'express';
import { AIGateway, GatewayMessage } from '../services/ai/aiGateway';
import { AIService } from '../services/ai/aiService';

const DEMO_MAX_TURNS = 15;

export class DemoChatController {
  static async chat(req: Request, res: Response) {
    try {
      const { message, history = [], userKeys = {}, mode = 'chat', model } = req.body;

      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({
          success: false,
          error: { message: 'Message is required.' },
        });
      }

      if (Array.isArray(history) && history.length > DEMO_MAX_TURNS * 2) {
        return res.status(400).json({
          success: false,
          error: { message: 'Demo conversation limit reached. Sign up for unlimited conversations.' },
        });
      }

      const windowedHistory: GatewayMessage[] = Array.isArray(history)
        ? history
            .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
            .slice(-12)
            .map((m: any) => ({ role: m.role, content: m.content }))
        : [];

      const systemPrompt = AIService.buildSystemInstructions(mode, message.trim());
      const result = await AIGateway.generate({
        messages: [
          { role: 'system', content: systemPrompt },
          ...windowedHistory,
          { role: 'user', content: message.trim() },
        ],
        model,
        userKeys,
        requestType: `demo_${mode}`,
      });

      return res.json({
        success: true,
        data: {
          content: result.content,
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
        },
      });
    } catch (err: any) {
      console.error('[DemoChatController] Error:', err.message);
      return res.status(500).json({
        success: false,
        error: { message: "I couldn't generate a response right now. Please try again." },
      });
    }
  }

  static async stream(req: Request, res: Response) {
    try {
      const { message, history = [], userKeys = {}, mode = 'chat', model } = req.body;

      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ success: false, error: { message: 'Message is required.' } });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const windowedHistory: GatewayMessage[] = Array.isArray(history)
        ? history
            .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
            .slice(-12)
            .map((m: any) => ({ role: m.role, content: m.content }))
        : [];

      const systemPrompt = AIService.buildSystemInstructions(mode, message.trim());
      for await (const chunk of AIGateway.stream({
        messages: [
          { role: 'system', content: systemPrompt },
          ...windowedHistory,
          { role: 'user', content: message.trim() },
        ],
        model,
        userKeys,
        requestType: `demo_stream_${mode}`,
      })) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      console.error('[DemoChatController.stream] Error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: { message: 'Stream failed' } });
      } else {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
    }
  }
}
