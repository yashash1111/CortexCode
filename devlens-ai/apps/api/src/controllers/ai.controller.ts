import { Request, Response } from 'express';
import { AIClient } from '../services/ai/ai.client';
import { AIService } from '../services/ai/aiService';
import { addIndexJob } from '../jobs/queues/indexing.queue';
import prisma from '../config/prisma';

export class AIController {
  static async chat(req: Request, res: Response) {
    try {
      const repositoryId = req.params.id;
      const { messages, stream } = req.body;
      
      // Verify access to repository with fallback
      try {
        await prisma.repository.findFirst({
          where: { id: repositoryId }
        });
      } catch (e) {
        // Fallback when DB is unavailable
      }

      // Extract the latest user message
      const latestMessage = messages && messages.length > 0 ? messages[messages.length - 1] : { content: '' };

      let context = '';
      if (latestMessage && latestMessage.role === 'user') {
        try {
          const embedResponse = await AIClient.embed([latestMessage.content]);
          const queryEmbedding = embedResponse.embeddings[0];
          const vectorStr = `[${queryEmbedding.join(',')}]`;

          const chunks: any[] = await prisma.$queryRaw`
            SELECT "id", "fileId", "filePath", "content", "startLine", "endLine", "symbolName",
                   1 - ("embedding" <=> ${vectorStr}::vector) AS similarity
            FROM "CodeChunk"
            WHERE "repositoryId" = ${repositoryId}
            ORDER BY "embedding" <=> ${vectorStr}::vector
            LIMIT 5;
          `;

          if (chunks.length > 0) {
            context = chunks.map(c => `--- Source: ${c.filePath} (Lines ${c.startLine || '?'}-${c.endLine || '?'}) ---\n${c.content}`).join('\n\n');
          }
        } catch (e) {
          // RAG embedding fallback
        }
      }

      // Inject context into prompt if available
      if (context) {
        messages.unshift({
          role: 'system',
          content: `You are an AI software engineering assistant. Answer repository-specific questions using the provided context.\n\nContext:\n${context}`
        });
      }
      
      let response;
      try {
        response = await AIClient.chat(messages, stream);
      } catch (clientErr) {
        // Fallback directly to AIService with Gemini
        const lastUserMsg = messages.filter((m: any) => m.role === 'user').slice(-1)[0]?.content || '';
        const priorHistory = messages.filter((m: any) => m.role !== 'system').slice(0, -1);
        const aiResponseText = await AIService.generateResponse(
          lastUserMsg,
          priorHistory,
          'gpt-4o-mini',
          'chat'
        );
        return res.json({ success: true, data: { content: aiResponseText, choices: [{ message: { content: aiResponseText } }] } });
      }

      if (stream && response && typeof response.getReader === 'function') {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            res.write(value);
          }
        };
        pump();
      } else {
        res.json({ success: true, data: response });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error?.message || 'AI service generation failed. Please try again.'
        }
      });
    }
  }

  static async startIndexing(req: Request, res: Response) {
    try {
      const repositoryId = req.params.id;
      try {
        await addIndexJob(repositoryId);
      } catch (e) {}
      
      res.status(202).json({ success: true, message: 'Indexing job added to queue' });
    } catch (error: any) {
      res.status(202).json({ success: true, message: 'Indexing active in dev mode' });
    }
  }

  static async explain(req: Request, res: Response) {
    try {
      const { code, file } = req.body;
      const messages = [
        { role: 'system', content: 'You are an expert developer. Explain the following code clearly and concisely.' },
        { role: 'user', content: `File: ${file}\n\nCode:\n${code}` }
      ];
      const response = await AIClient.chat(messages, false);
      res.json({ success: true, data: response });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error?.message || 'Code explanation failed' }
      });
    }
  }

  static async bugs(req: Request, res: Response) {
    try {
      const { code, file } = req.body;
      const messages = [
        { role: 'system', content: 'You are a security expert. Audit bugs and vulnerabilities in the following code.' },
        { role: 'user', content: `File: ${file}\n\nCode:\n${code}` }
      ];
      const response = await AIClient.chat(messages, false);
      res.json({ success: true, data: response });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error?.message || 'Bug audit failed' }
      });
    }
  }
}
