import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../../config/prisma';
import { authenticate } from '../../../middleware/auth.middleware';
import { addDocIngestionJob } from '../../../jobs/queues/doc_ingestion.queue';
import { DocRagService, formatCitationLabel } from '../services/docRagService';
import { DocEvalService } from '../services/docEvalService';
import { AIGateway, GatewayMessage } from '../../ai/services/aiGateway';
import { ActivityService } from '../../profile/services/activity.service';

const router = Router();
router.use(authenticate);

const MAX_DOC_SIZE = 15 * 1024 * 1024; // 15 MB
const ALLOWED_EXTS = new Set(['pdf', 'md', 'markdown']);
const ALLOWED_MIMES = new Set(['application/pdf', 'text/markdown', 'text/x-markdown', 'text/plain']);
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads', 'docs');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOC_SIZE, files: 10 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTS.has(ext) || (!ALLOWED_MIMES.has(file.mimetype) && !file.mimetype.startsWith('text/'))) {
      cb(new Error('Only PDF (.pdf) and Markdown (.md, .markdown) files up to 15 MB are allowed.'));
      return;
    }
    cb(null, true);
  },
});

async function assertWorkspaceOwned(workspaceId: string, userId: string) {
  return prisma.workspace.findFirst({ where: { id: workspaceId, userId } });
}

// POST /api/docs/upload
router.post('/upload', upload.single('file') as any, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = String(req.body.workspaceId || '').trim();
    const file = req.file;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { message: 'workspaceId is required' } });
    }
    if (!file) {
      return res.status(400).json({ success: false, error: { message: 'A PDF or Markdown file is required' } });
    }

    const workspace = await assertWorkspaceOwned(workspaceId, userId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: { message: 'Workspace not found or access denied' } });
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf' && file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return res.status(400).json({ success: false, error: { message: 'Invalid PDF file header' } });
    }

    const docId = uuidv4();
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const dir = path.join(UPLOADS_ROOT, workspaceId);
    await fs.mkdir(dir, { recursive: true });
    const storedPath = path.join(dir, `${docId}_${safeName}`);
    await fs.writeFile(storedPath, file.buffer);

    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const document = await prisma.document.create({
      data: {
        id: docId,
        workspaceId,
        userId,
        title: file.originalname,
        fileName: file.originalname,
        mimeType: ext === 'pdf' ? 'application/pdf' : 'text/markdown',
        size: file.size,
        sourcePath: storedPath,
        checksum,
        status: 'PENDING',
      },
    });

    const job = await addDocIngestionJob({ documentId: document.id, workspaceId, userId });

    ActivityService.recordUserActivity(userId, 'doc_uploaded', {
      documentId: document.id,
      fileName: file.originalname,
    }).catch(() => {});

    return res.status(202).json({
      success: true,
      data: { document, jobId: job.id, job },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message || 'Upload failed' } });
  }
});

// GET /api/docs?workspaceId=...
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = String(req.query.workspaceId || '').trim();
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { message: 'workspaceId query param is required' } });
    }

    const workspace = await assertWorkspaceOwned(workspaceId, userId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: { message: 'Workspace not found' } });
    }

    const [documents, jobs] = await Promise.all([
      prisma.document.findMany({
        where: { workspaceId, userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.ingestionJob.findMany({
        where: { workspaceId, userId, moduleType: 'doc' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const latestJobByDoc = new Map<string, any>();
    for (const j of jobs) {
      if (j.sourceId && !latestJobByDoc.has(j.sourceId)) {
        latestJobByDoc.set(j.sourceId, j);
      }
    }

    const enriched = documents.map((d) => ({
      ...d,
      content: undefined, // omit full text from list response
      latestJob: latestJobByDoc.get(d.id) || null,
    }));

    return res.json({ success: true, data: enriched });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: 'Failed to list documents' } });
  }
});

// GET /api/docs/chat/history?workspaceId=...
router.get('/chat/history', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = String(req.query.workspaceId || '').trim();
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { message: 'workspaceId is required' } });
    }

    const workspace = await assertWorkspaceOwned(workspaceId, userId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: { message: 'Workspace not found' } });
    }

    const conv = await prisma.conversation.findFirst({
      where: { workspaceId, userId, moduleType: 'doc' },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    return res.json({ success: true, data: { conversationId: conv?.id || null, messages: conv?.messages || [] } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: 'Failed to load chat history' } });
  }
});

// DELETE /api/docs/chat/history?workspaceId=...
router.delete('/chat/history', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = String(req.query.workspaceId || '').trim();
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { message: 'workspaceId is required' } });
    }
    await prisma.conversation.deleteMany({ where: { workspaceId, userId, moduleType: 'doc' } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Failed to clear chat history' } });
  }
});

// POST /api/docs/search
router.post('/search', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId, query, documentIds, topK } = req.body;
    if (!workspaceId || !query) {
      return res.status(400).json({ success: false, error: { message: 'workspaceId and query are required' } });
    }

    const workspace = await assertWorkspaceOwned(workspaceId, userId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: { message: 'Workspace not found' } });
    }

    const chunks = await DocRagService.hybridSearch({ workspaceId, query, documentIds, topK, userId });
    return res.json({ success: true, data: chunks });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message || 'Search failed' } });
  }
});

// POST /api/docs/chat — Streaming SSE RAG Chat
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId, message, documentIds, topK = 6, model } = req.body;

    if (!workspaceId || !message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: { message: 'workspaceId and message are required' } });
    }

    const workspace = await assertWorkspaceOwned(workspaceId, userId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: { message: 'Workspace not found' } });
    }

    let conv = await prisma.conversation.findFirst({
      where: { workspaceId, userId, moduleType: 'doc' },
      orderBy: { updatedAt: 'desc' },
    });
    if (!conv) {
      conv = await prisma.conversation.create({
        data: { workspaceId, userId, moduleType: 'doc' },
      });
    }

    const priorMessages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    await prisma.message.create({
      data: { conversationId: conv.id, role: 'user', content: message.trim() },
    });

    const retrieved = await DocRagService.hybridSearch({
      workspaceId,
      query: message.trim(),
      documentIds,
      topK,
      userId,
    });

    const sourcesPayload = retrieved.map((c) => ({
      id: c.id,
      documentId: c.documentId,
      documentName: c.documentName,
      pageNumber: c.pageNumber,
      sectionHeading: c.sectionHeading,
      citationLabel: formatCitationLabel(c),
      content: c.content,
      score: c.score,
    }));

    const systemPrompt = DocRagService.buildGroundedSystemPrompt(retrieved);
    const gatewayMessages: GatewayMessage[] = [
      { role: 'system', content: systemPrompt },
      ...priorMessages.map((m) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.content,
      })),
      { role: 'user', content: message.trim() },
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Emit retrieved sources immediately so the UI can populate citations
    res.write(`data: ${JSON.stringify({ type: 'sources', sources: sourcesPayload, conversationId: conv.id })}\n\n`);

    let fullAnswer = '';
    const generator = AIGateway.stream({
      messages: gatewayMessages,
      model,
      temperature: 0.2,
      userId,
      workspaceId,
      requestType: 'docs_rag_chat',
    });

    while (true) {
      const next = await generator.next();
      if (next.done) {
        const usageMeta = next.value;
        const saved = await prisma.message.create({
          data: {
            conversationId: conv.id,
            role: 'assistant',
            content: fullAnswer,
            sources: sourcesPayload as any,
          },
        });
        res.write(
          `data: ${JSON.stringify({
            type: 'done',
            messageId: saved.id,
            usage: usageMeta
              ? {
                  model: usageMeta.model,
                  provider: usageMeta.provider,
                  latencyMs: usageMeta.latencyMs,
                  totalTokens: usageMeta.totalTokens,
                  estimatedCost: usageMeta.estimatedCost,
                }
              : null,
          })}\n\n`
        );
        res.write('data: [DONE]\n\n');
        res.end();
        break;
      } else {
        fullAnswer += next.value;
        res.write(`data: ${JSON.stringify({ type: 'token', content: next.value })}\n\n`);
      }
    }
  } catch (err: any) {
    console.error('[DocsChat] Error:', err.message);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: { message: err.message || 'Docs chat failed' } });
    }
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message || 'Stream error' })}\n\n`);
    res.end();
  }
});

// POST /api/docs/evals/run
router.post('/evals/run', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId, name, cases, topK } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { message: 'workspaceId is required' } });
    }

    const workspace = await assertWorkspaceOwned(workspaceId, userId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: { message: 'Workspace not found' } });
    }

    const run = await DocEvalService.runEvaluation({ workspaceId, userId, name, cases, topK });
    return res.status(201).json({ success: true, data: run });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message || 'Evaluation run failed' } });
  }
});

// GET /api/docs/evals?workspaceId=...
router.get('/evals', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = String(req.query.workspaceId || '').trim();
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { message: 'workspaceId is required' } });
    }

    const workspace = await assertWorkspaceOwned(workspaceId, userId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: { message: 'Workspace not found' } });
    }

    const runs = await prisma.evalRun.findMany({
      where: { workspaceId, userId, moduleType: 'doc' },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return res.json({ success: true, data: runs });
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Failed to load eval runs' } });
  }
});

// GET /api/docs/evals/:runId
router.get('/evals/:runId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const run = await prisma.evalRun.findFirst({
      where: { id: req.params.runId, userId },
      include: { cases: { orderBy: { createdAt: 'asc' } } },
    });
    if (!run) {
      return res.status(404).json({ success: false, error: { message: 'Evaluation run not found' } });
    }
    return res.json({ success: true, data: run });
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Failed to load eval run' } });
  }
});

// GET /api/docs/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!doc) {
      return res.status(404).json({ success: false, error: { message: 'Document not found' } });
    }

    const [jobs, chunks] = await Promise.all([
      prisma.ingestionJob.findMany({
        where: { sourceId: doc.id, userId, moduleType: 'doc' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.$queryRaw<any[]>`
        SELECT "id", "sourcePath", "metadata", "content", "createdAt"
        FROM "KnowledgeChunk"
        WHERE "workspaceId" = ${doc.workspaceId}
          AND "moduleType" = 'doc'
          AND "metadata"->>'documentId' = ${doc.id}
        ORDER BY ("metadata"->>'chunkIndex')::int ASC;
      `,
    ]);

    return res.json({ success: true, data: { document: doc, jobs, chunks } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: 'Failed to load document' } });
  }
});

// GET /api/docs/:id/file — serve raw PDF or Markdown for the Citation Viewer
router.get('/:id/file', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!doc) {
      return res.status(404).json({ success: false, error: { message: 'Document not found' } });
    }

    const buffer = await fs.readFile(doc.sourcePath);
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);
    return res.send(buffer);
  } catch {
    return res.status(404).json({ success: false, error: { message: 'Document file not found on disk' } });
  }
});

// POST /api/docs/:id/reindex
router.post('/:id/reindex', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!doc) {
      return res.status(404).json({ success: false, error: { message: 'Document not found' } });
    }

    const job = await addDocIngestionJob({
      documentId: doc.id,
      workspaceId: doc.workspaceId,
      userId,
    });

    return res.status(202).json({ success: true, data: { jobId: job.id, job } });
  } catch (err: any) {
    return res.status(503).json({ success: false, error: { message: err.message || 'Failed to enqueue reindex' } });
  }
});

// DELETE /api/docs/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!doc) {
      return res.status(404).json({ success: false, error: { message: 'Document not found' } });
    }

    await prisma.$executeRaw`
      DELETE FROM "KnowledgeChunk"
      WHERE "workspaceId" = ${doc.workspaceId}
        AND "moduleType" = 'doc'
        AND "metadata"->>'documentId' = ${doc.id}
    `;

    await prisma.document.delete({ where: { id: doc.id } });
    await fs.unlink(doc.sourcePath).catch(() => {});

    return res.json({ success: true, data: { deletedId: doc.id } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: 'Failed to delete document' } });
  }
});

export default router;
