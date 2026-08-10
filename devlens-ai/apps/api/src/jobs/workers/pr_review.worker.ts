import { Worker, Job } from 'bullmq';
import { connection } from '../../config/redis';
import prisma from '../../config/prisma';
import { AIClient } from '../../services/ai/ai.client';
import { GitHubClient } from '../../services/github/github.client';

let worker: any = null;
try {
  worker = new Worker('pr-review', async (job: Job) => {
    const { repositoryId, prNumber } = job.data;

    try {
      const repo = await prisma.repository.findUnique({ where: { id: repositoryId }, include: { user: { include: { githubAccount: true } } } });
      if (!repo || !repo.user.githubAccount) throw new Error('Repository or GitHub account not found');

      const token = repo.user.githubAccount.accessTokenEncrypted;
      const diff = await GitHubClient.getPullRequestDiff(token, repo.owner, repo.name, prNumber);
      const context = `Diff:\n${diff}`;

      const prompt = [
        { role: 'system', content: 'You are an AI code reviewer. Review the following PR diff for correctness, security, and performance.' },
        { role: 'user', content: context }
      ];

      const aiResponse = await AIClient.chat(prompt);

      await prisma.pullRequestReview.create({
        data: {
          pullRequestId: 'mock-pr-id',
          status: 'completed',
          summary: aiResponse.content
        }
      });

    } catch (error: any) {
      console.error('PR Review failed:', error);
      throw error;
    }
  }, { connection });

  worker.on('error', () => {});
} catch (e) {
  // Silent worker initialization when running standalone without redis
}

export const prReviewWorker = worker;
