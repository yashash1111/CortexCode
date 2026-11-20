import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

export const requireTeamRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = req.params.teamId;
      const userId = req.user!.userId;

      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } },
      });

      if (!membership || !allowedRoles.includes(membership.role)) {
        return res.status(403).json({ error: 'Insufficient team permissions' });
      }

      next();
    } catch {
      res.status(500).json({ error: 'Internal server error during authorization' });
    }
  };
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: { message: 'Administrator access required' } });
    }
    next();
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Authorization check failed' } });
  }
};
