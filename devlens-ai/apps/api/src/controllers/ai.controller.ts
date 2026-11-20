import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { AIGateway, GatewayMessage } from '../services/ai/aiGateway';
import { EmbeddingService } from '../services/ai/embeddingService';
import { addIndexJob } from '../jobs/queues/indexing.queue';
import { wrapUntrustedContext } from '../utils/promptGuard';

export class AIController {
  static async chat(req: Request, res: Response) {
    try {
      const repositoryId = req.params.id;
      const userId = req.user!.userId;
      const { messages, stream, model, provider } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'messages array is required' },
        });
      }

      const repo = await prisma.repository.findFirst({
        where: { id: repositoryId, userId },
      });
      if (!repo) {
        return res.status(404).json({
          success: false,
          error: { message: 'Repository not found or access denied' },
        });
      }

      const latestMessage = messages[messages.length - 1];
      let context = '';

      if (latestMessage && latestMessage.role === 'user' && typeof latestMessage.content === 'string') {
        try {
          if (repo.workspaceId) {
            const chunks = await EmbeddingService.searchKnowledgeChunks({
              workspaceId: repo.workspaceId,
              moduleType: 'repo',
              query: latestMessage.content,
              limit: 5,
              userId,
            });
            if (chunks.length > 0) {
              context = chunks
                .map((c) => `--- Source: ${c.sourcePath} ---\n${c.content}`)
                .join('\n\n');
            }
          } else {
            const { embeddings } = await EmbeddingService.generateEmbeddings([latestMessage.content], {
              userId,
            });
            const vectorStr = `[${embeddings[0].join(',')}]`;
            const chunks: any[] = await prisma.$queryRaw`
              SELECT "id", "fileId", "filePath", "content", "startLine", "endLine", "symbolName",
                     1 - ("embedding" <=> ${vectorStr}::vector) AS similarity
              FROM "CodeChunk"
              WHERE "repositoryId" = ${repositoryId}
                AND "embedding" IS NOT NULL
              ORDER BY "embedding" <=> ${vectorStr}::vector
              LIMIT 5;
            `;
            if (chunks.length > 0) {
              context = chunks
                .map((c) => `--- Source: ${c.filePath} (Lines ${c.startLine || '?'}-${c.endLine || '?'}) ---\n${c.content}`)
                .join('\n\n');
            }
          }
        } catch (embedErr: any) {
          console.warn('[AIController.chat] Retrieval skipped:', embedErr.message);
        }
      }

      const gatewayMessages: GatewayMessage[] = messages.map((m: any) => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
        content: String(m.content || ''),
      }));

      if (context) {
        gatewayMessages.unshift({
          role: 'system',
          content: `You are an AI software engineering assistant. Answer repository-specific questions using the provided context.\n\n${wrapUntrustedContext('repository', context)}`,
        });
      }

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
          for await (const chunk of AIGateway.stream({
            messages: gatewayMessages,
            model,
            provider,
            userId,
            workspaceId: repo.workspaceId || undefined,
            requestType: 'repo_chat_stream',
          })) {
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          }
          res.write('data: [DONE]\n\n');
          res.end();
        } catch (streamErr: any) {
          res.write(`data: ${JSON.stringify({ error: streamErr.message })}\n\n`);
          res.end();
        }
        return;
      }

      const result = await AIGateway.generate({
        messages: gatewayMessages,
        model,
        provider,
        userId,
        workspaceId: repo.workspaceId || undefined,
        requestType: 'repo_chat',
      });

      return res.json({
        success: true,
        data: {
          content: result.content,
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
          usage: {
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            totalTokens: result.totalTokens,
            estimatedCost: result.estimatedCost,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error?.message || 'AI service generation failed.' },
      });
    }
  }

  static async startIndexing(req: Request, res: Response) {
    try {
      const repositoryId = req.params.id;
      const userId = req.user!.userId;

      const repo = await prisma.repository.findFirst({
        where: { id: repositoryId, userId },
      });
      if (!repo) {
        return res.status(404).json({
          success: false,
          error: { message: 'Repository not found or access denied' },
        });
      }

      const job = await addIndexJob({
        repositoryId,
        userId,
        workspaceId: repo.workspaceId || undefined,
      });

      return res.status(202).json({
        success: true,
        message: 'Indexing job queued',
        data: { jobId: job.id, status: job.status },
      });
    } catch (error: any) {
      return res.status(503).json({
        success: false,
        error: { message: error?.message || 'Failed to enqueue indexing job' },
      });
    }
  }

  static async explain(req: Request, res: Response) {
    try {
      const repositoryId = req.params.id;
      const userId = req.user!.userId;
      const { code, file, model, provider } = req.body;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ success: false, error: { message: 'code is required' } });
      }

      const repo = await prisma.repository.findFirst({ where: { id: repositoryId, userId } });
      if (!repo) {
        return res.status(404).json({ success: false, error: { message: 'Repository not found or access denied' } });
      }

      const result = await AIGateway.generate({
        messages: [
          { role: 'system', content: 'You are an expert developer. Explain the following code clearly and concisely.' },
          { role: 'user', content: wrapUntrustedContext('code', `File: ${file || 'unknown'}\n\n${code}`) },
        ],
        model,
        provider,
        userId,
        workspaceId: repo.workspaceId || undefined,
        requestType: 'explain',
      });

      return res.json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error?.message || 'Code explanation failed' },
      });
    }
  }

  static async bugs(req: Request, res: Response) {
    try {
      const repositoryId = req.params.id;
      const userId = req.user!.userId;
      const { code, file, model, provider } = req.body;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ success: false, error: { message: 'code is required' } });
      }

      const repo = await prisma.repository.findFirst({ where: { id: repositoryId, userId } });
      if (!repo) {
        return res.status(404).json({ success: false, error: { message: 'Repository not found or access denied' } });
      }

      const result = await AIGateway.generate({
        messages: [
          { role: 'system', content: 'You are a security expert. Audit bugs and vulnerabilities in the following code.' },
          { role: 'user', content: wrapUntrustedContext('code', `File: ${file || 'unknown'}\n\n${code}`) },
        ],
        model,
        provider,
        userId,
        workspaceId: repo.workspaceId || undefined,
        requestType: 'bug_audit',
      });

      return res.json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error?.message || 'Bug audit failed' },
      });
    }
  }
}
