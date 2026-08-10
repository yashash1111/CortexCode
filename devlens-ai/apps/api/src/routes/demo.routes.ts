import { Router } from 'express';
import { DemoChatController } from '../controllers/demo.controller';

const router = Router();

/**
 * POST /api/demo/chat
 * Standard JSON response
 */
router.post('/chat', DemoChatController.chat);

/**
 * POST /api/demo/chat/stream
 * Real-time SSE streaming word-by-word response
 */
router.post('/chat/stream', DemoChatController.stream);

export default router;
