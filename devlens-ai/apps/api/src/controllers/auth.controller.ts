import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { setAuthCookies, clearAuthCookies } from '../utils/cookies';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../validators/auth.validator';
import { hashPassword } from '../utils/password';
import {
  recordLoginSecurityEvent,
  recordPasswordChangeSecurityEvent,
  getUserSecurityEvents,
  revokeUserSessions
} from '../services/securityService';

export class AuthController {
  private static parseErrorMessage(error: any): string {
    if (error.issues && Array.isArray(error.issues)) {
      return error.issues.map((i: any) => i.message).join('. ');
    }
    if (typeof error.message === 'string') {
      if (error.message.startsWith('[')) {
        try {
          const parsed = JSON.parse(error.message);
          if (Array.isArray(parsed)) {
            return parsed.map((i: any) => i.message || i).join('. ');
          }
        } catch { /* ignore */ }
      }
      return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  }

  static async register(req: Request, res: Response) {
    try {
      const data = registerSchema.parse(req.body);
      const { user, accessToken, refreshToken } = await AuthService.register({
        name: data.name,
        email: data.email,
        password: data.password
      });

      // Set secure HttpOnly cookies
      setAuthCookies(res, accessToken, refreshToken);

      // Trigger Welcome Email in background
      EmailService.sendWelcomeEmail(user.email, user.name).catch(console.error);

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        data: { user, accessToken, refreshToken }
      });
    } catch (error: any) {
      const message = AuthController.parseErrorMessage(error);
      return res.status(400).json({ success: false, error: { message } });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const data = loginSchema.parse(req.body);
      const { user, accessToken, refreshToken } = await AuthService.login({
        email: data.email,
        password: data.password
      });

      // Set secure HttpOnly cookies
      setAuthCookies(res, accessToken, refreshToken);

      // Trigger Login Alert Email and record security event
      recordLoginSecurityEvent(req, user).catch(console.error);

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: { user, accessToken, refreshToken }
      });
    } catch (error: any) {
      const message = AuthController.parseErrorMessage(error);
      return res.status(401).json({ success: false, error: { message } });
    }
  }

  static async me(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
      }

      const user = await AuthService.getUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({ success: false, error: { message: 'User account not found' } });
      }

      return res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: { message: 'Failed to retrieve user profile' } });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) {
        clearAuthCookies(res);
        return res.status(401).json({ success: false, error: { message: 'Refresh token required' } });
      }

      const { user, accessToken, refreshToken: newRefreshToken } = await AuthService.refreshSession(refreshToken);
      setAuthCookies(res, accessToken, newRefreshToken);

      return res.status(200).json({
        success: true,
        message: 'Session refreshed successfully.',
        data: { user, accessToken, refreshToken: newRefreshToken }
      });
    } catch (error: any) {
      clearAuthCookies(res);
      return res.status(401).json({ success: false, error: { message: 'Session expired. Please log in again.' } });
    }
  }

  static async logout(req: Request, res: Response) {
    clearAuthCookies(res);
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const data = forgotPasswordSchema.parse(req.body);
      const user = await AuthService.getUserById(data.email);

      const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      AuthService.resetTokens.set(token, data.email);

      // Dispatch reset email
      EmailService.sendPasswordResetEmail(data.email, user?.name || 'Developer', token).catch(console.error);

      // Generic response to prevent user enumeration
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, password reset instructions have been sent.'
      });
    } catch (error: any) {
      const message = AuthController.parseErrorMessage(error);
      return res.status(400).json({ success: false, error: { message } });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const data = resetPasswordSchema.parse(req.body);
      const email = AuthService.resetTokens.get(data.token);

      if (!email) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid or expired password reset link.' }
        });
      }

      const hashedPassword = await hashPassword(data.password);
      await AuthService.updatePasswordByEmail(email, hashedPassword);
      AuthService.resetTokens.delete(data.token);

      clearAuthCookies(res);

      return res.status(200).json({
        success: true,
        message: 'Your password has been reset successfully. Please sign in with your new password.'
      });
    } catch (error: any) {
      const message = AuthController.parseErrorMessage(error);
      return res.status(400).json({ success: false, error: { message } });
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, error: { message: 'Please provide current password and a new password with at least 6 characters.' } });
      }

      const user = await AuthService.changePassword(userId, currentPassword, newPassword);

      // Invalidate old sessions
      await revokeUserSessions(userId);

      // Record Security Event & Trigger Email Notification
      recordPasswordChangeSecurityEvent(req, user).catch(console.error);

      return res.status(200).json({
        success: true,
        message: '✓ Password changed successfully. A security notification has been sent to your registered email address.'
      });
    } catch (error: any) {
      const message = AuthController.parseErrorMessage(error);
      return res.status(400).json({ success: false, error: { message } });
    }
  }

  static async getSecurityEvents(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
      }

      const events = await getUserSecurityEvents(userId);
      return res.status(200).json({
        success: true,
        data: { events }
      });
    } catch {
      return res.status(500).json({ success: false, error: { message: 'Failed to retrieve security events.' } });
    }
  }

  static async revokeSessions(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
      }

      await revokeUserSessions(userId);
      return res.status(200).json({
        success: true,
        message: 'Signed out of all other sessions successfully.'
      });
    } catch {
      return res.status(500).json({ success: false, error: { message: 'Failed to revoke sessions.' } });
    }
  }
}
