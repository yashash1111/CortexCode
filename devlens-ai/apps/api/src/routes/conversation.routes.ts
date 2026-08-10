import { Router } from 'express';
import { ConversationController } from '../controllers/conversation.controller';

const router = Router();

router.get('/', ConversationController.list);
router.post('/', ConversationController.create);
router.get('/:id', ConversationController.get);
router.patch('/:id', ConversationController.update);
router.delete('/:id', ConversationController.delete);

router.post('/:id/messages', ConversationController.sendMessage);

export default router;
