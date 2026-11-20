import { Request, Response } from 'express';
import { AIGateway, GatewayMessage } from '../../ai/services/aiGateway';
import { AIService } from '../../ai/services/aiService';
import { redactSecrets } from '../../ai/services/secretRedactor';

const DEMO_MAX_TURNS = 15;

export class DemoChatController {
  static async chat(req: Request, res: Response) {
    try {
      const { message, history = [], mode = 'chat', model } = req.body;

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
      const safeMsg = redactSecrets(err?.message || 'Unknown error');
      console.error('[DemoChatController] Error:', safeMsg);
      const status = typeof err?.status === 'number' ? err.status : 500;
      return res.status(status).json({
        success: false,
        error: {
          message:
            status === 429 || status === 503
              ? safeMsg
              : 'AI service is temporarily unavailable. Please try again shortly.',
        },
      });
    }
  }

  static async stream(req: Request, res: Response) {
    try {
      const { message, history = [], mode = 'chat', model } = req.body;

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
        requestType: `demo_stream_${mode}`,
      })) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      const safeMsg = redactSecrets(err?.message || 'Stream failed');
      console.error('[DemoChatController.stream] Error:', safeMsg);
      const status = typeof err?.status === 'number' ? err.status : 500;
      if (!res.headersSent) {
        res.status(status).json({ success: false, error: { message: status === 429 || status === 503 ? safeMsg : 'Stream failed' } });
      } else {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
    }
  }
}
