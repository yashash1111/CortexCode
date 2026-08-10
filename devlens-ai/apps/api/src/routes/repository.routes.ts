import { Router } from 'express';
import { RepositoryController } from '../controllers/repository.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate); // Protect all repository routes

router.post('/import', RepositoryController.import);
router.get('/', RepositoryController.list);
router.get('/:id', RepositoryController.get);
router.delete('/:id', RepositoryController.delete);

export default router;
