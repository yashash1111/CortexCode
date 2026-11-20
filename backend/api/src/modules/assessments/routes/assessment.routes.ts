import { Router } from 'express';
import { AssessmentController } from '../controllers/assessment.controller';

const router = Router();

// 1. Static & Collection Endpoints (MUST be registered before /:id)
router.get('/', AssessmentController.list);
router.post('/', AssessmentController.create);
router.post('/generate', AssessmentController.generate);
router.get('/history', AssessmentController.getHistory);
router.get('/creator/results', AssessmentController.getCreatorResults);

// 2. Reusable Question Bank Endpoints
router.get('/bank/questions', AssessmentController.getQuestionBank);
router.post('/bank/questions', AssessmentController.saveQuestionToBank);

// 3. Candidate Assessment Session Lifecycle, Auto-save, Code Execution & Evaluation
router.get('/sessions/:sessionId', AssessmentController.getSession);
router.post('/sessions/:sessionId/answers', AssessmentController.saveAnswer);
router.post('/sessions/:sessionId/code/run', AssessmentController.runCode);
router.post('/sessions/:sessionId/violations', AssessmentController.recordProctoringViolation);
router.post('/sessions/:sessionId/submit', AssessmentController.submitAssessment);
router.get('/sessions/:sessionId/result', AssessmentController.getResult);
router.get('/sessions/:sessionId/evaluation-status', AssessmentController.getEvaluationStatus);
router.post('/sessions/:sessionId/review', AssessmentController.reviewAssessment);

// 4. Analytics & Export Endpoints
router.get('/:id/analytics', AssessmentController.getAssessmentAnalytics);
router.get('/:id/export', AssessmentController.exportResults);

// 5. Single Assessment Parameterized Endpoints
router.post('/:id/start', AssessmentController.startSession);
router.get('/:id', AssessmentController.getById);
router.put('/:id', AssessmentController.update);
router.post('/:id/publish', AssessmentController.publish);
router.post('/:id/archive', AssessmentController.archive);
router.delete('/:id', AssessmentController.delete);

export default router;
