import { Queue } from 'bullmq';
import { connection } from '../../config/redis';
import prisma from '../../config/prisma';

export const docIngestionQueue = new Queue('doc-ingestion', { connection });

docIngestionQueue.on('error', (err) => {
  console.error('[DocIngestionQueue] Redis error:', err.message);
});

export async function addDocIngestionJob(params: {
  documentId: string;
  workspaceId: string;
  userId: string;
}) {
  const { documentId, workspaceId, userId } = params;
  const dedupeKey = `doc:${documentId}`;

  const existingActive = await prisma.ingestionJob.findFirst({
    where: {
      dedupeKey,
      status: { in: ['queued', 'processing'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingActive) {
    return existingActive;
  }

  const ingestionJob = await prisma.ingestionJob.create({
    data: {
      workspaceId,
      userId,
      moduleType: 'doc',
      sourceId: documentId,
      dedupeKey,
      status: 'queued',
      progress: 0,
      metadata: { stage: 'queued' },
    },
  });

  try {
    const bullJob = await docIngestionQueue.add(
      'ingest-doc',
      {
        ingestionJobId: ingestionJob.id,
        documentId,
        workspaceId,
        userId,
      },
      {
        jobId: ingestionJob.id,
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      }
    );

    return prisma.ingestionJob.update({
      where: { id: ingestionJob.id },
      data: { bullJobId: bullJob.id ? String(bullJob.id) : ingestionJob.id },
    });
  } catch (err: any) {
    await prisma.ingestionJob.update({
      where: { id: ingestionJob.id },
      data: {
        status: 'failed',
        error: `Failed to enqueue document job: ${err.message}`,
        metadata: { stage: 'failed' },
        completedAt: new Date(),
      },
    });
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED' },
    }).catch(() => {});
    throw new Error(`Queue unavailable: ${err.message}`);
  }
}
