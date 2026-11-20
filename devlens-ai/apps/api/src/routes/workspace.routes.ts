import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// POST /api/workspaces — Create workspace persisted in PostgreSQL
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Workspace name is required.' });
    }

    const ws = await prisma.workspace.create({
      data: {
        userId,
        name: name.trim(),
        description: description ? String(description).trim() : null,
      },
    });

    return res.status(201).json({ success: true, data: ws });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to create workspace.' });
  }
});

// GET /api/workspaces — List workspaces owned by authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const workspaces = await prisma.workspace.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ success: true, data: workspaces });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to load workspaces.' });
  }
});

// GET /api/workspaces/:id — Get workspace details (ownership enforced)
router.get('/:id', async (req: Request, res: Response) => {
  const ws = await prisma.workspace.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!ws) return res.status(404).json({ success: false, error: 'Workspace not found.' });
  return res.json({ success: true, data: ws });
});

// DELETE /api/workspaces/:id — Delete workspace (ownership enforced)
router.delete('/:id', async (req: Request, res: Response) => {
  const ws = await prisma.workspace.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!ws) return res.status(404).json({ success: false, error: 'Workspace not found.' });
  await prisma.workspace.delete({ where: { id: ws.id } });
  return res.json({ success: true });
});

export default router;
