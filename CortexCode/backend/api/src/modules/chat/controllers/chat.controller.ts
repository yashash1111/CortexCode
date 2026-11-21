import { Request, Response } from 'express';
import { AIGateway, GatewayMessage } from '../../ai/services/aiGateway';
import { AIService } from '../../ai/services/aiService';
import { normalizeChatMode } from '../../ai/services/modePrompts';
import { redactSecrets } from '../../ai/services/secretRedactor';
import { ConversationService } from '../services/conversation.service';
import { ActivityService, mapChatModeToActivityAction } from '../../profile/services/activity.service';

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

      if (req.user?.userId) {
        ActivityService.recordUserActivity(
          req.user.userId,
          mapChatModeToActivityAction(mode),
          { mode, conversationId: conversationId || null, source: 'chat_sync' }
        ).catch(() => {});
      }

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

  static async streamChat(req: Request, res: Response) {
    const requestId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    try {
      const userId = req.user?.userId;
      const { message, messages = [], conversationId, history = [], mode = 'chat', model, workspaceId } = req.body;
      const promptText = message || (messages.length > 0 ? messages[messages.length - 1]?.content : '');

      if (!promptText || typeof promptText !== 'string' || !promptText.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Message content is required.' },
        });
      }

      const activeMode = normalizeChatMode(mode);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const writeEvent = (event: string, data: unknown) => {
        if (res.writableEnded) return;
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      let resolvedConvId = conversationId || `conv-${Date.now()}`;
      let userMessageId: string | undefined;
      let priorHistory: GatewayMessage[] = (history.length > 0 ? history : messages.slice(0, -1))
        .slice(-12)
        .map((m: any) => ({
          role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
          content: String(m.content || m.text || ''),
        }));

      if (userId && conversationId) {
        writeEvent('activity', { stage: 'saving', detail: 'Saving message & loading context...' });
        const ctx = await ConversationService.saveUserMessageAndLoadContext({
          userId,
          convId: conversationId,
          content: promptText,
          mode: activeMode,
        });
        resolvedConvId = ctx.conversation.id;
        userMessageId = ctx.userMessage.id;
        priorHistory = ctx.priorHistory;
      }

      writeEvent('message_start', {
        requestId,
        conversationId: resolvedConvId,
        userMessageId,
        mode: activeMode,
      });

      writeEvent('activity', {
        stage: 'generating',
        detail: `Streaming ${activeMode.toUpperCase()} response...`,
      });

      const systemPrompt = AIService.buildSystemInstructions(activeMode, promptText.trim());
      const gatewayMessages: GatewayMessage[] = [
        { role: 'system', content: systemPrompt },
        ...priorHistory,
        { role: 'user', content: promptText.trim() },
      ];

      let fullText = '';
      let finalMeta: { provider?: string; model?: string; totalTokens?: number; inputTokens?: number; outputTokens?: number } = {};
      const gen = AIGateway.stream({
        messages: gatewayMessages,
        model,
        userId,
        workspaceId,
        requestType: activeMode,
      });

      while (true) {
        if (clientDisconnected) {
          await gen.return?.(undefined as any);
          break;
        }
        const next = await gen.next();
        if (next.done) {
          if (next.value) finalMeta = next.value;
          break;
        }
        if (next.value) {
          fullText += next.value;
          writeEvent('token', { content: next.value });
        }
      }

      if (clientDisconnected) {
        if (!res.writableEnded) res.end();
        return;
      }

      let savedMessage: unknown = { role: 'assistant', content: fullText, mode: activeMode };
      if (userId && conversationId) {
        savedMessage = await ConversationService.saveAssistantMessage({
          conversationId: resolvedConvId,
          userId,
          content: fullText,
          mode: activeMode,
          provider: finalMeta.provider,
          model: finalMeta.model,
        });
      }

      if (userId) {
        ActivityService.recordUserActivity(
          userId,
          mapChatModeToActivityAction(activeMode),
          { mode: activeMode, conversationId: resolvedConvId, source: 'chat_stream' }
        ).catch(() => {});
      }

      writeEvent('message_complete', {
        requestId,
        conversationId: resolvedConvId,
        message: savedMessage,
        provider: finalMeta.provider,
        model: finalMeta.model,
        usage: {
          inputTokens: finalMeta.inputTokens ?? 0,
          outputTokens: finalMeta.outputTokens ?? 0,
          totalTokens: finalMeta.totalTokens ?? 0,
        },
      });
      res.end();
    } catch (err: any) {
      const safeMsg = redactSecrets(err?.message || 'AI streaming failed');
      const status = typeof err?.status === 'number' ? err.status : 500;
      if (!res.headersSent) {
        res.status(status).json({ success: false, error: { message: safeMsg } });
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({ requestId, message: safeMsg })}\n\n`);
        if (!res.writableEnded) res.end();
      }
    }
  }
}
