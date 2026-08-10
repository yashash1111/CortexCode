import { Worker, Job } from 'bullmq';
import { connection } from '../../config/redis';
import prisma from '../../config/prisma';
import { AIClient } from '../../services/ai/ai.client';

let worker: any = null;
try {
  worker = new Worker('repository-indexing', async (job: Job) => {
    const { repositoryId } = job.data;

    try {
      const dbJob = await prisma.job.create({
        data: {
          repositoryId,
          type: 'repository_index',
          status: 'processing',
          startedAt: new Date(),
          total: 100,
        }
      });

      const files = await prisma.repositoryFile.findMany({
        where: { repositoryId }
      });

      await prisma.codeChunk.deleteMany({
        where: { repositoryId }
      });

      let processed = 0;
      for (const file of files) {
        if (!file.content) continue;
        const chunks = [file.content.substring(0, 1000)];
        const embedResponse = await AIClient.embed(chunks);
        const embeddings = embedResponse.embeddings;

        await prisma.$executeRaw`
          INSERT INTO "CodeChunk" ("id", "repositoryId", "fileId", "content", "filePath", "language", "chunkIndex", "tokenCount", "embedding", "updatedAt")
          VALUES (gen_random_uuid(), ${repositoryId}, ${file.id}, ${chunks[0]}, ${file.path}, ${file.language}, 0, 10, ${embeddings[0]}::vector, NOW())
        `;

        processed++;
        await job.updateProgress(Math.floor((processed / files.length) * 100));
        await prisma.job.update({ where: { id: dbJob.id }, data: { processed, progress: Math.floor((processed / files.length) * 100) } });
      }

      await prisma.job.update({
        where: { id: dbJob.id },
        data: { status: 'completed', completedAt: new Date() }
      });

    } catch (error: any) {
      console.error('Indexing failed:', error);
      throw error;
    }
  }, { connection });

  worker.on('error', () => {});
} catch (e) {
  // Silent worker initialization when running standalone without redis
}

export const indexingWorker = worker;
