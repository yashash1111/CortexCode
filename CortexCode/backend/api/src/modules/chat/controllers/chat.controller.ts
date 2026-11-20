import { Request, Response } from 'express';
import { AIGateway, GatewayMessage } from '../../ai/services/aiGateway';
import { AIService } from '../../ai/services/aiService';
import { redactSecrets } from '../../ai/services/secretRedactor';

export class ChatController {
  static async handleChat(req: Request, res: Response) {
    try {
      const {
        message,
        messages = [],
        conversationId,
        history = [],
        mode = 'chat',
        model,
        provider,
        workspaceId,
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
      const safeMsg = redactSecrets(err?.message || 'Unknown AI error');
      console.error('[Chat] Controller error:', safeMsg);
      const status = typeof err?.status === 'number' ? err.status : undefined;
      const isRateLimit = status === 429 || safeMsg.includes('429') || safeMsg.toLowerCase().includes('quota');
      const isUnavailable = status === 503 || safeMsg.includes('temporarily unavailable') || safeMsg.includes('not configured') || safeMsg.includes('No AI provider');
      const httpStatus = status || (isRateLimit ? 429 : isUnavailable ? 503 : 500);

      return res.status(httpStatus).json({
        success: false,
        error: {
          code: isRateLimit ? 'RATE_LIMITED' : isUnavailable ? 'AI_UNAVAILABLE' : 'AI_SERVICE_ERROR',
          message: isRateLimit
            ? (err?.message && status === 429 ? safeMsg : 'Too many requests. Please try again shortly.')
            : isUnavailable
            ? 'AI service is temporarily unavailable. Please try again shortly.'
            : 'Cortex AI could not generate a response. Please try again.',
        },
      });
    }
  }
}
