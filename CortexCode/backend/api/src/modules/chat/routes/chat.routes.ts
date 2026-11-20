import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../../../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/chat (Authenticated centralized AI chat)
 */
router.post('/', authenticate, ChatController.handleChat);

export default router;
