import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

export const requireTeamRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = req.params.teamId;
      const userId = req.user!.userId; // Auth middleware sets this

      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } }
      });

      if (!membership || !allowedRoles.includes(membership.role)) {
        return res.status(403).json({ error: 'Insufficient team permissions' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error during authorization' });
    }
  };
};

// Usage Example: router.post('/teams/:teamId/repositories', requireTeamRole(['Owner', 'Admin']), TeamController.addRepo);
