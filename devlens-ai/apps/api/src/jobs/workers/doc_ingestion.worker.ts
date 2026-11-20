import { Worker, Job } from 'bullmq';
import fs from 'fs/promises';
import { connection } from '../../config/redis';
import prisma from '../../config/prisma';
import { AIClient } from '../../services/ai/ai.client';
import { EmbeddingService } from '../../services/ai/embeddingService';

async function updateStage(
  ingestionJobId: string,
  stage: string,
  progress: number,
  extra?: { total?: number; processed?: number }
) {
  await prisma.ingestionJob.update({
    where: { id: ingestionJobId },
    data: {
      status: 'processing',
      progress,
      metadata: { stage },
      ...(extra?.total !== undefined ? { total: extra.total } : {}),
      ...(extra?.processed !== undefined ? { processed: extra.processed } : {}),
    },
  });
}

export const docIngestionWorker = new Worker(
  'doc-ingestion',
  async (job: Job) => {
    const { ingestionJobId, documentId, workspaceId, userId } = job.data;

    try {
      const doc = await prisma.document.findUnique({ where: { id: documentId } });
      if (!doc) {
        throw new Error(`Document ${documentId} not found`);
      }

      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      });

      await prisma.ingestionJob.update({
        where: { id: ingestionJobId },
        data: {
          status: 'processing',
          startedAt: new Date(),
          progress: 15,
          attempts: job.attemptsMade + 1,
          metadata: { stage: 'extracting' },
        },
      });
      await job.updateProgress(15);

      const fileBuffer = await fs.readFile(doc.sourcePath);
      const isPdf = doc.mimeType === 'application/pdf' || doc.fileName.toLowerCase().endsWith('.pdf');

      await updateStage(ingestionJobId, 'chunking', 35);
      await job.updateProgress(35);

      const parsed = await AIClient.parseAndChunkDocument({
        fileType: isPdf ? 'pdf' : 'markdown',
        sourcePath: doc.fileName,
        ...(isPdf
          ? { contentBase64: fileBuffer.toString('base64') }
          : { text: fileBuffer.toString('utf-8') }),
        chunkSize: 1200,
        chunkOverlap: 180,
      });

      const chunks: Array<{
        chunk_index: number;
        content: string;
        source_path: string;
        page_number?: number | null;
        section_heading?: string | null;
        token_count: number;
      }> = parsed.chunks || [];

      if (chunks.length === 0) {
        throw new Error('No indexable chunks were extracted from the document');
      }

      await updateStage(ingestionJobId, 'embedding', 55, { total: chunks.length, processed: 0 });
      await job.updateProgress(55);

      const BATCH_SIZE = 16;
      const allEmbeddings: number[][] = [];
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchTexts = chunks.slice(i, i + BATCH_SIZE).map((c) => c.content);
        const { embeddings } = await EmbeddingService.generateEmbeddings(batchTexts, {
          userId,
          workspaceId,
        });
        allEmbeddings.push(...embeddings);
        const embedProgress = 55 + Math.floor(((i + batchTexts.length) / chunks.length) * 25);
        await updateStage(ingestionJobId, 'embedding', embedProgress, {
          total: chunks.length,
          processed: i + batchTexts.length,
        });
        await job.updateProgress(embedProgress);
      }

      await updateStage(ingestionJobId, 'saving', 85, { total: chunks.length, processed: chunks.length });
      await job.updateProgress(85);

      // Remove previous chunks for this document before inserting updated vectors
      await prisma.$executeRaw`
        DELETE FROM "KnowledgeChunk"
        WHERE "workspaceId" = ${workspaceId}
          AND "moduleType" = 'doc'
          AND "metadata"->>'documentId' = ${documentId}
      `;

      for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        const vectorLiteral = `[${allEmbeddings[idx].join(',')}]`;
        const metaJson = JSON.stringify({
          documentId,
          documentName: doc.fileName,
          pageNumber: chunk.page_number ?? null,
          sectionHeading: chunk.section_heading ?? null,
          chunkIndex: chunk.chunk_index,
          tokenCount: chunk.token_count,
        });

        await prisma.$executeRaw`
          INSERT INTO "KnowledgeChunk" ("id", "workspaceId", "jobId", "moduleType", "sourcePath", "metadata", "content", "embedding", "createdAt")
          VALUES (gen_random_uuid(), ${workspaceId}, ${ingestionJobId}, 'doc', ${doc.fileName}, ${metaJson}::jsonb, ${chunk.content}, ${vectorLiteral}::vector, NOW())
        `;
      }

      await prisma.document.update({
        where: { id: documentId },
        data: {
          title: parsed.title || doc.title,
          content: parsed.extracted_text || null,
          status: 'INDEXED',
          chunkCount: chunks.length,
          lastIndexedAt: new Date(),
          metadata: {
            ...(typeof doc.metadata === 'object' && doc.metadata ? (doc.metadata as Record<string, any>) : {}),
            ...(parsed.metadata || {}),
            pageCount: parsed.page_count || 1,
          },
        },
      });

      await prisma.ingestionJob.update({
        where: { id: ingestionJobId },
        data: {
          status: 'completed',
          progress: 100,
          total: chunks.length,
          processed: chunks.length,
          metadata: { stage: 'completed' },
          completedAt: new Date(),
        },
      });
      await job.updateProgress(100);

      return { documentId, chunks: chunks.length };
    } catch (error: any) {
      console.error('[DocIngestionWorker] Failed:', error.message);
      if (ingestionJobId) {
        await prisma.ingestionJob.update({
          where: { id: ingestionJobId },
          data: {
            status: 'failed',
            error: error.message || 'Document ingestion failed',
            attempts: job.attemptsMade + 1,
            metadata: { stage: 'failed' },
            completedAt: new Date(),
          },
        }).catch(() => {});
      }
      if (documentId) {
        await prisma.document.update({
          where: { id: documentId },
          data: { status: 'FAILED' },
        }).catch(() => {});
      }
      throw error;
    }
  },
  { connection, concurrency: 2 }
);

docIngestionWorker.on('error', (err) => {
  console.error('[DocIngestionWorker] Worker error:', err.message);
});
