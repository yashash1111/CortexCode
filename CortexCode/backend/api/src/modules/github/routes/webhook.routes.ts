import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

// Webhooks shouldn't be protected by our standard user JWT auth
router.post('/github', WebhookController.githubWebhook);

export default router;
