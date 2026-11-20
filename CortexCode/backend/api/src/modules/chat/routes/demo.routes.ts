import { Router } from 'express';
import { DemoChatController } from '../controllers/demo.controller';
import { demoRateLimiter } from '../../../middleware/rateLimit.middleware';

const router = Router();

router.use(demoRateLimiter);

/**
 * POST /api/demo/chat
 * Standard JSON response
 */
router.post('/chat', DemoChatController.chat);

/**
 * POST /api/demo/chat/stream
 * Real-time SSE streaming response
 */
router.post('/chat/stream', DemoChatController.stream);

export default router;
