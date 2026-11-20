import { Queue } from 'bullmq';
import { connection } from '../../config/redis';
import prisma from '../../config/prisma';

export const indexingQueue = new Queue('repository-indexing', { connection });

indexingQueue.on('error', (err) => {
  console.error('[IndexingQueue] Redis error:', err.message);
});

export interface EnqueueIndexParams {
  repositoryId: string;
  userId: string;
  workspaceId?: string;
  branch?: string;
  syncGitHub?: boolean;
}

export async function addIndexJob(params: EnqueueIndexParams) {
  const { repositoryId, userId, branch, syncGitHub } = params;

  // Ensure a workspace exists for the repository so KnowledgeChunk isolation is always enforced
  let workspaceId = params.workspaceId;
  if (!workspaceId) {
    const repo = await prisma.repository.findFirst({ where: { id: repositoryId, userId } });
    if (!repo) {
      throw new Error('Repository not found or access denied');
    }
    if (repo.workspaceId) {
      workspaceId = repo.workspaceId;
    } else {
      const ws = await prisma.workspace.create({
        data: {
          userId,
          name: repo.name,
          description: repo.description || `Workspace for ${repo.fullName}`,
        },
      });
      await prisma.repository.update({
        where: { id: repo.id },
        data: { workspaceId: ws.id },
      });
      workspaceId = ws.id;
    }
  }

  const dedupeKey = `repo:${repositoryId}`;

  // Duplicate-job protection
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
      moduleType: 'repo',
      sourceId: repositoryId,
      dedupeKey,
      status: 'queued',
      progress: 0,
    },
  });

  try {
    const bullJob = await indexingQueue.add(
      'index',
      {
        ingestionJobId: ingestionJob.id,
        repositoryId,
        workspaceId,
        userId,
        branch,
        syncGitHub: Boolean(syncGitHub),
      },
      {
        jobId: ingestionJob.id,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
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
        error: `Failed to enqueue job: ${err.message}`,
        completedAt: new Date(),
      },
    });
    throw new Error(`Queue unavailable: ${err.message}`);
  }
}
