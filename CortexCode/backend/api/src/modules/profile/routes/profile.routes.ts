import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../../../middleware/auth.middleware';
import { ProfileController } from '../controllers/profile.controller';

const router = Router();

const ALLOWED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.has(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, WEBP, and GIF images are allowed.'));
    }
  },
});

// Avatar file serving
router.get('/avatar/:filename', ProfileController.serveAvatar);

// All remaining profile routes require authentication
router.use(authenticate);

router.get('/', ProfileController.getProfile);
router.patch('/', ProfileController.updateProfile);

router.post('/avatar', (req: Request, res: Response, next: NextFunction) => {
  (avatarUpload.single('avatar') as any)(req, res, (err: any) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Avatar image must be smaller than 2 MB.'
        : err.message || 'Invalid avatar upload.';
      return res.status(400).json({ success: false, error: { message: msg } });
    }
    return next();
  });
}, ProfileController.uploadAvatar);

router.delete('/avatar', ProfileController.removeAvatar);

router.put('/preferences', ProfileController.updatePreferences);
router.patch('/preferences', ProfileController.updatePreferences);
router.put('/skills', ProfileController.updateSkills);

router.get('/activity', ProfileController.getActivity);
router.get('/activity/heatmap', ProfileController.getActivityHeatmap);
router.get('/activity/recent', ProfileController.getRecentActivity);
router.post('/activity', ProfileController.recordClientActivity);

router.delete('/account', ProfileController.deleteAccount);

export default router;
