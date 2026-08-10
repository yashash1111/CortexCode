import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router({ mergeParams: true }); // Allows accessing :id from parent router

router.use(authenticate); // Protect all AI routes

router.post('/chat', AIController.chat);
router.post('/index', AIController.startIndexing);
router.post('/explain', AIController.explain);
router.post('/bugs', AIController.bugs);

export default router;
