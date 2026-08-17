import { Request, Response } from 'express';
import { AIService } from '../services/ai/aiService';

export class ChatController {
  /**
   * POST /api/chat
   * Centralized secure backend endpoint for chat completions
   */
  static async handleChat(req: Request, res: Response) {
    try {
      const {
        message,
        messages = [],
        conversationId,
        history = [],
        mode = 'chat',
        model = 'gemini-3.5-flash-lite',
        userKeys
      } = req.body;

      const promptText = message || (messages.length > 0 ? messages[messages.length - 1]?.content : '');

      if (!promptText || typeof promptText !== 'string' || promptText.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Message content is required.'
          }
        });
      }

      // Convert messages or history into standard format
      const formattedHistory = (history.length > 0 ? history : messages.slice(0, -1)).map((m: any) => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
        content: m.content || m.text || ''
      }));

      // Safe Server Log
      console.log(`[Chat] Incoming request | mode=${mode} | historyCount=${formattedHistory.length} | conversationId=${conversationId || 'transient'}`);

      const aiResponse = await AIService.generateResponse(
        promptText.trim(),
        formattedHistory,
        model,
        mode,
        userKeys
      );

      console.log(`[Chat] AI Response generated successfully | responseLength=${aiResponse.length}`);

      return res.status(200).json({
        success: true,
        data: {
          content: aiResponse,
          conversationId: conversationId || `conv-${Date.now()}`,
          model,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err: any) {
      console.error('[Chat] Controller error:', err.message);

      const isRateLimit = err.message?.includes('429') || err.message?.toLowerCase().includes('quota');
      const isMissingConfig = err.message?.includes('not configured');

      const statusCode = isRateLimit ? 429 : 500;
      const code = isRateLimit
        ? 'RATE_LIMITED'
        : isMissingConfig
        ? 'AI_CONFIG_MISSING'
        : 'AI_SERVICE_ERROR';

      const userMessage = isRateLimit
        ? 'Too many requests. Please try again shortly.'
        : isMissingConfig
        ? 'AI service is temporarily unavailable. Please configure API keys.'
        : 'Cortex AI could not generate a response. Please try again.';

      return res.status(statusCode).json({
        success: false,
        error: {
          code,
          message: userMessage
        }
      });
    }
  }
}
