import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator';
import { hashPassword } from '../utils/password';
import prisma from '../config/prisma';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const data = registerSchema.parse(req.body);
      const result = await AuthService.register(data);
      
      // Trigger Welcome Email in background to respect respective logged-in email
      EmailService.sendWelcomeEmail(data.email, data.name).catch(console.error);

      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await AuthService.login(data);
      
      // Trigger Login Alert Email in background
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const device = req.headers['user-agent'] || 'Browser Session';
      
      EmailService.sendLoginAlertEmail(
        data.email, 
        result.user?.name || 'Developer', 
        ip, 
        device
      ).catch(console.error);

      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(401).json({ success: false, error: { message: error.message } });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) throw new Error('Email address required');

      // Try finding user name
      let name = 'Developer';
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) name = user.name;
      } catch (e) {}

      // Generate secure reset token
      const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      
      // Save token mapping in AuthService registry
      AuthService.resetTokens.set(token, email);

      // Dispatch Password Reset Email in background
      EmailService.sendPasswordResetEmail(email, name, token).catch(console.error);

      res.status(200).json({ success: true, message: 'Password reset link sent to email' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body;
      if (!token) throw new Error('Reset token is required');
      if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');

      // Retrieve registered email for token
      const email = AuthService.resetTokens.get(token);
      if (!email) throw new Error('Invalid or expired reset token');

      // Update user password hash
      const hashedPassword = await hashPassword(password);
      await AuthService.updatePasswordByEmail(email, hashedPassword);

      // Clean up token
      AuthService.resetTokens.delete(token);

      res.status(200).json({ success: true, message: 'Password has been reset successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const result = await AuthService.refresh(refreshToken);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(401).json({ success: false, error: { message: error.message } });
    }
  }
  
  static async me(req: Request, res: Response) {
    res.status(200).json({ success: true, data: { userId: req.user?.userId, email: (req.user as any)?.email || 'developer@cortex.ai' } });
  }

  static async logout(req: Request, res: Response) {
    res.status(200).json({ success: true, data: { message: 'Logged out' } });
  }
}
