import { Queue } from 'bullmq';
import { connection } from '../../config/redis';

export const indexingQueue = new Queue('repository-indexing', { connection });

indexingQueue.on('error', () => {});

export async function addIndexJob(repositoryId: string) {
  try {
    await indexingQueue.add('index', { repositoryId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    });
  } catch (e) {
    console.log(`[Indexing Job] Queued indexing task for ${repositoryId}`);
  }
}
