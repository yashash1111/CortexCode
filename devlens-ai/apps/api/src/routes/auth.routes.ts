import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.post('/register', authRateLimiter, AuthController.register);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.me);
router.post('/refresh', AuthController.refresh);
router.post('/forgot-password', passwordResetRateLimiter, AuthController.forgotPassword);
router.post('/reset-password', passwordResetRateLimiter, AuthController.resetPassword);

export default router;
