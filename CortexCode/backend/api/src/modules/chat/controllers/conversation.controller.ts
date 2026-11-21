import { Request, Response } from 'express';
import { ConversationService } from '../services/conversation.service';
import { AIGateway, GatewayMessage } from '../../ai/services/aiGateway';
import { AIService } from '../../ai/services/aiService';
import { normalizeChatMode } from '../../ai/services/modePrompts';
import { redactSecrets } from '../../ai/services/secretRedactor';

function writeSseEvent(res: Response, event: string, data: unknown) {
  if (res.writableEnded) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export class ConversationController {
  static async list(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const search = req.query.q as string | undefined;
      const grouped = await ConversationService.listConversations(userId, search);
      res.json({ success: true, data: grouped });
    } catch (err: any) {
      res.status(err?.status || 500).json({ success: false, error: { message: redactSecrets(err?.message || 'Failed to list conversations') } });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { title, model } = req.body;
      const conv = await ConversationService.createConversation(userId, title, model);
      res.status(201).json({ success: true, data: conv });
    } catch (err: any) {
      res.status(err?.status || 500).json({ success: false, error: { message: redactSecrets(err?.message || 'Failed to create conversation') } });
    }
  }

  static async get(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const conv = await ConversationService.getConversation(userId, req.params.id);
      if (!conv) {
        return res.status(404).json({ success: false, error: { message: 'Conversation not found' } });
      }
      res.json({ success: true, data: conv });
    } catch (err: any) {
      res.status(err?.status || 500).json({ success: false, error: { message: redactSecrets(err?.message || 'Failed to get conversation') } });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const conv = await ConversationService.updateConversation(userId, req.params.id, req.body);
      if (!conv) {
        return res.status(404).json({ success: false, error: { message: 'Conversation not found' } });
      }
      res.json({ success: true, data: conv });
    } catch (err: any) {
      res.status(err?.status || 500).json({ success: false, error: { message: redactSecrets(err?.message || 'Failed to update conversation') } });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const deleted = await ConversationService.deleteConversation(userId, req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: { message: 'Conversation not found' } });
      }
      res.json({ success: true, data: { message: 'Conversation deleted' } });
    } catch (err: any) {
      res.status(err?.status || 500).json({ success: false, error: { message: redactSecrets(err?.message || 'Failed to delete conversation') } });
    }
  }

  static async clearAll(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const count = await ConversationService.clearUserConversations(userId);
      res.json({ success: true, data: { deletedCount: count } });
    } catch (err: any) {
      res.status(err?.status || 500).json({ success: false, error: { message: redactSecrets(err?.message || 'Failed to clear conversations') } });
    }
  }

  static async sendMessage(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { content, attachments, mode } = req.body;
      if (!content || typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ success: false, error: { message: 'Message content required' } });
      }

      const result = await ConversationService.addMessage(userId, id, 'user', content, attachments, mode || 'chat');
      res.json({ success: true, data: result });
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      res.status(status).json({
        success: false,
        error: { message: redactSecrets(err?.message || 'Failed to send message') },
      });
    }
  }

  static async streamMessage(req: Request, res: Response) {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { content, attachments, mode = 'chat', model } = req.body;

      if (!content || typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ success: false, error: { message: 'Message content required' } });
      }

      const activeMode = normalizeChatMode(mode);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      writeSseEvent(res, 'activity', { stage: 'saving', detail: 'Saving message & loading context...' });

      const ctx = await ConversationService.saveUserMessageAndLoadContext({
        userId,
        convId: id,
        content,
        mode: activeMode,
        attachments,
      });

      writeSseEvent(res, 'message_start', {
        requestId,
        conversationId: ctx.conversation.id,
        userMessageId: ctx.userMessage.id,
        mode: activeMode,
        title: ctx.conversation.title,
      });

      if (clientDisconnected) {
        res.end();
        return;
      }

      writeSseEvent(res, 'activity', {
        stage: 'generating',
        detail: `Running ${activeMode.toUpperCase()} mode via centralized AI gateway...`,
      });

      const systemPrompt = AIService.buildSystemInstructions(activeMode, content);
      const gatewayMessages: GatewayMessage[] = [
        { role: 'system', content: systemPrompt },
        ...ctx.priorHistory,
        { role: 'user', content: content.trim() },
      ];

      let fullText = '';
      let finalMeta: {
        provider?: string;
        model?: string;
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
      } = {};

      const gen = AIGateway.stream({
        messages: gatewayMessages,
        model: model || ctx.conversation.model,
        userId,
        requestType: activeMode,
      });

      while (true) {
        if (clientDisconnected) {
          await gen.return?.(undefined as any);
          break;
        }
        const next = await gen.next();
        if (next.done) {
          if (next.value) {
            finalMeta = {
              provider: next.value.provider,
              model: next.value.model,
              inputTokens: next.value.inputTokens,
              outputTokens: next.value.outputTokens,
              totalTokens: next.value.totalTokens,
            };
          }
          break;
        }
        if (next.value) {
          fullText += next.value;
          writeSseEvent(res, 'token', { content: next.value });
        }
      }

      if (clientDisconnected) {
        // Save partial output if any was streamed before abort
        if (fullText.trim()) {
          await ConversationService.saveAssistantMessage({
            conversationId: ctx.conversation.id,
            content: fullText,
            mode: activeMode,
            provider: finalMeta.provider,
            model: finalMeta.model,
          }).catch(() => {});
        }
        if (!res.writableEnded) res.end();
        return;
      }

      const savedAi = await ConversationService.saveAssistantMessage({
        conversationId: ctx.conversation.id,
        userId,
        content: fullText,
        mode: activeMode,
        provider: finalMeta.provider,
        model: finalMeta.model,
      });

      writeSseEvent(res, 'message_complete', {
        requestId,
        conversationId: ctx.conversation.id,
        message: savedAi,
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
      const safeMsg = redactSecrets(err?.message || 'AI streaming failed.');
      const status = typeof err?.status === 'number' ? err.status : 500;
      if (!res.headersSent) {
        res.status(status).json({ success: false, error: { message: safeMsg } });
      } else {
        writeSseEvent(res, 'error', {
          requestId,
          code: status === 429 ? 'RATE_LIMITED' : status === 503 ? 'AI_UNAVAILABLE' : 'STREAM_ERROR',
          message: safeMsg,
        });
        if (!res.writableEnded) res.end();
      }
    }
  }
}
