import { Request, Response } from 'express';
import { AIGateway, GatewayMessage } from '../../ai/services/aiGateway';
import { AIService } from '../../ai/services/aiService';

export class ChatController {
  static async handleChat(req: Request, res: Response) {
    try {
      const {
        message,
        messages = [],
        conversationId,
        history = [],
        mode = 'chat',
        model = 'gemini-3.5-flash-lite',
        provider,
        workspaceId,
        userKeys,
      } = req.body;

      const promptText = message || (messages.length > 0 ? messages[messages.length - 1]?.content : '');

      if (!promptText || typeof promptText !== 'string' || promptText.trim() === '') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Message content is required.' },
        });
      }

      const formattedHistory: GatewayMessage[] = (history.length > 0 ? history : messages.slice(0, -1))
        .slice(-12)
        .map((m: any) => ({
          role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
          content: String(m.content || m.text || ''),
        }));

      const systemPrompt = AIService.buildSystemInstructions(mode, promptText.trim());
      const gatewayMessages: GatewayMessage[] = [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
        { role: 'user', content: promptText.trim() },
      ];

      const result = await AIGateway.generate({
        messages: gatewayMessages,
        model,
        provider,
        userKeys,
        userId: req.user?.userId,
        workspaceId,
        requestType: mode,
      });

      return res.status(200).json({
        success: true,
        data: {
          content: result.content,
          conversationId: conversationId || `conv-${Date.now()}`,
          model: result.model,
          provider: result.provider,
          latencyMs: result.latencyMs,
          usage: {
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            totalTokens: result.totalTokens,
            estimatedCost: result.estimatedCost,
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('[Chat] Controller error:', err.message);
      const isRateLimit = err.message?.includes('429') || err.message?.toLowerCase().includes('quota');
      const isMissingConfig = err.message?.includes('not configured') || err.message?.includes('No AI provider');

      return res.status(isRateLimit ? 429 : 500).json({
        success: false,
        error: {
          code: isRateLimit ? 'RATE_LIMITED' : isMissingConfig ? 'AI_CONFIG_MISSING' : 'AI_SERVICE_ERROR',
          message: isRateLimit
            ? 'Too many requests. Please try again shortly.'
            : isMissingConfig
            ? 'AI service is temporarily unavailable. Please configure API keys.'
            : 'Cortex AI could not generate a response. Please try again.',
        },
      });
    }
  }
}
