import { Router } from 'express';
import { ConversationController } from '../controllers/conversation.controller';
import { authenticate } from '../../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', ConversationController.list);
router.post('/', ConversationController.create);
router.delete('/', ConversationController.clearAll);
router.get('/:id', ConversationController.get);
router.patch('/:id', ConversationController.update);
router.delete('/:id', ConversationController.delete);

router.post('/:id/messages', ConversationController.sendMessage);
router.post('/:id/messages/stream', ConversationController.streamMessage);

export default router;
