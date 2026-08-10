import { Queue } from 'bullmq';
import { connection } from '../../config/redis';

export const prReviewQueue = new Queue('pr-review', { connection });

export async function addPRReviewJob(repositoryId: string, prNumber: number) {
  await prReviewQueue.add('review', { repositoryId, prNumber }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }
  });
}
