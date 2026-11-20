import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../../../config/prisma';
import { addIndexJob } from '../../../jobs/queues/indexing.queue';
import { addPRReviewJob } from '../../../jobs/queues/pr_review.queue';

export class WebhookController {
  static async githubWebhook(req: Request, res: Response) {
    return WebhookController.handleGitHubWebhook(req, res);
  }

  static async handleGitHubWebhook(req: Request, res: Response) {
    const signature = req.headers['x-hub-signature-256'] as string;
    const eventType = req.headers['x-github-event'] as string;
    const deliveryId = req.headers['x-github-delivery'] as string;

    if (!signature || !eventType || !deliveryId) {
      return res.status(400).json({ error: 'Missing required GitHub webhook headers' });
    }

    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      return res.status(503).json({ error: 'GITHUB_WEBHOOK_SECRET is not configured' });
    }

    const payloadStr = JSON.stringify(req.body);
    const hmac = crypto.createHmac('sha256', secret);
    const expectedDigest = 'sha256=' + hmac.update(payloadStr).digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedDigest);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    try {
      const existingEvent = await prisma.webhookEvent.findUnique({
        where: { githubDeliveryId: deliveryId },
      });
      if (existingEvent) {
        return res.status(200).json({ message: 'Event already processed (duplicate delivery ignored)' });
      }

      const githubRepoId = req.body.repository?.id?.toString();
      let repoRecord: { id: string; userId: string; workspaceId: string | null } | null = null;
      if (githubRepoId) {
        repoRecord = await prisma.repository.findUnique({ where: { githubId: githubRepoId } });
      }

      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          githubDeliveryId: deliveryId,
          eventType,
          repositoryId: repoRecord?.id || null,
          payloadHash: crypto.createHash('sha256').update(payloadStr).digest('hex'),
          status: 'received',
        },
      });

      if (eventType === 'push' && repoRecord) {
        await addIndexJob({
          repositoryId: repoRecord.id,
          userId: repoRecord.userId,
          workspaceId: repoRecord.workspaceId || undefined,
          syncGitHub: true,
        });
      }

      const action = req.body.action;
      if (
        eventType === 'pull_request' &&
        repoRecord &&
        ['opened', 'synchronize', 'reopened'].includes(action) &&
        req.body.pull_request?.number
      ) {
        await addPRReviewJob(repoRecord.id, Number(req.body.pull_request.number));
      }

      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: 'processed', processedAt: new Date() },
      });

      return res.status(202).json({ message: 'Webhook received and queued' });
    } catch (error: any) {
      console.error('[WebhookController] Error:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
