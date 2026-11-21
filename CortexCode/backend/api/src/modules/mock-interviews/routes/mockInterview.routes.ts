import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import { MockInterviewController } from '../controllers/mockInterview.controller';

const router = Router();

router.use(authenticate);

router.post('/sessions', MockInterviewController.createSession);
router.get('/sessions', MockInterviewController.listSessions);
router.get('/sessions/:id', MockInterviewController.getSession);
router.post('/sessions/:id/start', MockInterviewController.startSession);
router.post('/sessions/:id/resume', MockInterviewController.resumeSession);
router.post('/sessions/:id/answer', MockInterviewController.submitAnswer);
router.post('/sessions/:id/answer/stream', MockInterviewController.streamAnswer);
router.post('/sessions/:id/skip', MockInterviewController.skipQuestion);
router.post('/sessions/:id/finish', MockInterviewController.finishSession);
router.get('/sessions/:id/report', MockInterviewController.getReport);

export default router;
