import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { email?: string; name?: string };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // Extract token from HttpOnly cookie or Authorization Bearer header
  let token: string | undefined = req.cookies?.accessToken;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required. Please log in.' }
    });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { message: 'Session expired or invalid. Please log in again.' }
    });
  }
};
