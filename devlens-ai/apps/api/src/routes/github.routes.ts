import { Router } from 'express';
import { GitHubController } from '../controllers/github.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/connect', authenticate, GitHubController.connect);
router.get('/callback', GitHubController.callback);
router.get('/account', authenticate, GitHubController.account);
router.get('/repositories', authenticate, GitHubController.repositories);
router.delete('/disconnect', authenticate, GitHubController.disconnect);

export default router;
