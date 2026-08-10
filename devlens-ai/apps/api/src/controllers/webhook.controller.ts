import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { addIndexJob } from '../jobs/queues/indexing.queue';

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'dev_secret';

export class WebhookController {
  static async githubWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const eventType = req.headers['x-github-event'] as string;
      const deliveryId = req.headers['x-github-delivery'] as string;

      if (!signature || !eventType || !deliveryId) {
        return res.status(400).json({ error: 'Missing GitHub webhook headers' });
      }

      // Verify signature
      const payloadStr = JSON.stringify(req.body);
      const expectedSignature = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(payloadStr).digest('hex');
      
      try {
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
      } catch (err) {
        return res.status(401).json({ error: 'Invalid signature format' });
      }

      // Idempotency check
      const existingEvent = await prisma.webhookEvent.findUnique({
        where: { githubDeliveryId: deliveryId }
      });
      if (existingEvent) {
        return res.status(200).json({ message: 'Event already processed' });
      }

      // Record event
      const githubRepoId = req.body.repository?.id?.toString();
      let repositoryId = null;
      
      if (githubRepoId) {
        const repo = await prisma.repository.findUnique({ where: { githubId: githubRepoId } });
        if (repo) repositoryId = repo.id;
      }

      await prisma.webhookEvent.create({
        data: {
          githubDeliveryId: deliveryId,
          eventType,
          repositoryId,
          payloadHash: crypto.createHash('sha256').update(payloadStr).digest('hex'),
          status: 'received'
        }
      });

      // Handle Push Event -> Auto Sync
      if (eventType === 'push' && repositoryId) {
        await addIndexJob(repositoryId); // In Phase 3, the worker should be smart enough to just diff the push
      }
      
      // Handle Pull Request Event -> AI Review
      if (eventType === 'pull_request' && repositoryId) {
        // We will enqueue a PR review job here
        // await addPRReviewJob(repositoryId, req.body.pull_request.number);
      }

      res.status(202).json({ message: 'Webhook received and queued' });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
