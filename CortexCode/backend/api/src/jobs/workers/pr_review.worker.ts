import { Worker, Job } from 'bullmq';
import { connection } from '../../config/redis';
import prisma from '../../config/prisma';
import { PRReviewService } from '../../modules/pr-review/services/prReviewService';

export const prReviewWorker = new Worker(
  'pr-review',
  async (job: Job) => {
    const { repositoryId, prNumber } = job.data;

    try {
      const repo = await prisma.repository.findUnique({
        where: { id: repositoryId },
      });
      if (!repo) {
        throw new Error(`Repository ${repositoryId} not found`);
      }

      let workspaceId = repo.workspaceId;
      if (!workspaceId) {
        const ws = await prisma.workspace.create({
          data: { userId: repo.userId, name: repo.name },
        });
        await prisma.repository.update({ where: { id: repo.id }, data: { workspaceId: ws.id } });
        workspaceId = ws.id;
      }

      return await PRReviewService.runReview({
        userId: repo.userId,
        workspaceId,
        repositoryId: repo.id,
        prNumber: Number(prNumber),
      });
    } catch (error: any) {
      console.error('[PRReviewWorker] PR Review failed:', error.message);
      throw error;
    }
  },
  { connection, concurrency: 2 }
);

prReviewWorker.on('error', (err) => {
  console.error('[PRReviewWorker] Worker error:', err.message);
});
