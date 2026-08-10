import { Request, Response } from 'express';
import { AIService } from '../services/ai/aiService';

// Max conversation turns for the free demo (no auth)
const DEMO_MAX_TURNS = 15;

export class DemoChatController {
  /**
   * Public demo chat endpoint — standard JSON response.
   */
  static async chat(req: Request, res: Response) {
    try {
      const { message, history = [], userKeys = {}, mode = 'chat' } = req.body;

      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({
          success: false,
          error: { message: 'Message is required.' }
        });
      }

      if (Array.isArray(history) && history.length > DEMO_MAX_TURNS * 2) {
        return res.status(400).json({
          success: false,
          error: { message: 'Demo conversation limit reached. Sign up for unlimited conversations.' }
        });
      }

      const windowedHistory = Array.isArray(history)
        ? history
            .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
            .slice(-12)
        : [];

      const response = await AIService.generateResponse(
        message.trim(),
        windowedHistory,
        'gpt-4o-mini',
        mode,
        userKeys
      );

      return res.json({
        success: true,
        data: { content: response }
      });
    } catch (err: any) {
      console.error('[DemoChatController] Error:', err.message);
      return res.status(500).json({
        success: false,
        error: { message: "I couldn't generate a response right now. Please try again." }
      });
    }
  }

  /**
   * SSE Stream Endpoint — Word-by-word streaming response like Real ChatGPT / Gemini.
   */
  static async stream(req: Request, res: Response) {
    try {
      const { message, history = [], userKeys = {}, mode = 'chat' } = req.body;

      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ success: false, error: { message: 'Message is required.' } });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const windowedHistory = Array.isArray(history)
        ? history
            .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
            .slice(-12)
        : [];

      const fullResponse = await AIService.generateResponse(
        message.trim(),
        windowedHistory,
        'gpt-4o-mini',
        mode,
        userKeys
      );

      // Stream words smoothly with realistic typing effect
      const words = fullResponse.split(' ');
      for (let i = 0; i < words.length; i++) {
        const wordChunk = (i === 0 ? '' : ' ') + words[i];
        res.write(`data: ${JSON.stringify({ content: wordChunk })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 12));
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
