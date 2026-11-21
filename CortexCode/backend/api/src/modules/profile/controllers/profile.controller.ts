import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { clearAuthCookies } from '../../../shared/utils/cookies';
import {
  AVATAR_UPLOAD_DIR,
  ProfileService,
} from '../services/profile.service';
import {
  ActivityActionType,
  ActivityService,
  ALLOWED_CLIENT_ACTIVITIES,
} from '../services/activity.service';

function parseError(err: any): { status: number; message: string } {
  if (err instanceof ZodError) {
    return {
      status: 400,
      message: err.issues.map((i) => i.message).join('. '),
    };
  }
  const status = typeof err?.status === 'number' ? err.status : 400;
  return {
    status,
    message: err?.message || 'Request failed.',
  };
}

function detectImageExtension(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  // GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return 'gif';
  }
  // WEBP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

function formatActivityLabel(action: string): string {
  switch (action) {
    case 'ai_chat':
      return 'AI Chat session';
    case 'ai_debug':
    case 'debug_session':
      return 'Debug session';
    case 'ai_explain':
    case 'explain_session':
      return 'Code Explain session';
    case 'ai_notes':
    case 'notes_created':
      return 'Study Notes generated';
    case 'ai_review':
    case 'code_review':
      return 'Code / PR Review';
    case 'mock_interview':
    case 'mock_interview_completed':
      return 'Mock Interview';
    case 'goal_updated':
      return 'Goal Roadmap updated';
    case 'doc_uploaded':
      return 'Document uploaded';
    case 'doc_chat':
      return 'Documentation Q&A';
    case 'repo_analyzed':
      return 'Repository analyzed';
    default:
      return action.replace(/_/g, ' ');
  }
}

export class ProfileController {
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const [profile, stats] = await Promise.all([
        ProfileService.getProfile(userId),
        ProfileService.getProfileStats(userId),
      ]);

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: { message: 'User profile not found.' },
        });
      }

      return res.json({
        success: true,
        data: { user: profile, stats },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to load profile.' },
      });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const profile = await ProfileService.updateProfile(userId, req.body);
      return res.json({
        success: true,
        message: 'Profile updated successfully.',
        data: { user: profile },
      });
    } catch (err: any) {
      const { status, message } = parseError(err);
      return res.status(status).json({
        success: false,
        error: { message },
      });
    }
  }

  static async uploadAvatar(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: { message: 'Please select an image file to upload.' },
        });
      }

      const detectedExt = detectImageExtension(file.buffer);
      if (!detectedExt) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid image file. Supported formats: PNG, JPG, WEBP, GIF.' },
        });
      }

      fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
      const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
      const filename = `${safeId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${detectedExt}`;
      const targetPath = path.join(AVATAR_UPLOAD_DIR, filename);

      fs.writeFileSync(targetPath, file.buffer);

      const avatarUrl = `/api/profile/avatar/${filename}`;
      const profile = await ProfileService.updateAvatar(userId, avatarUrl);

      return res.json({
        success: true,
        message: 'Profile picture updated.',
        data: { user: profile },
      });
    } catch (err: any) {
      const { status, message } = parseError(err);
      return res.status(status).json({
        success: false,
        error: { message },
      });
    }
  }

  static async removeAvatar(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const profile = await ProfileService.updateAvatar(userId, null);
      return res.json({
        success: true,
        message: 'Profile picture removed.',
        data: { user: profile },
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to remove profile picture.' },
      });
    }
  }

  static async serveAvatar(req: Request, res: Response) {
    const filename = path.basename(String(req.params.filename || ''));
    if (!/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|gif)$/i.test(filename)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid avatar filename.' },
      });
    }

    const filePath = path.join(AVATAR_UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: { message: 'Avatar not found.' },
      });
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(filePath);
  }

  static async updatePreferences(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const profile = await ProfileService.updatePreferences(userId, req.body);
      return res.json({
        success: true,
        message: 'Preferences saved.',
        data: { user: profile },
      });
    } catch (err: any) {
      const { status, message } = parseError(err);
      return res.status(status).json({
        success: false,
        error: { message },
      });
    }
  }

  static async updateSkills(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const profile = await ProfileService.updateSkills(userId, req.body);
      return res.json({
        success: true,
        message: 'Skills updated.',
        data: { user: profile },
      });
    } catch (err: any) {
      const { status, message } = parseError(err);
      return res.status(status).json({
        success: false,
        error: { message },
      });
    }
  }

  static async getActivity(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const daysParam = Number(req.query.days) || 365;
      const [heatmap, recent] = await Promise.all([
        ActivityService.getActivityHeatmap(userId, daysParam),
        ActivityService.getRecentActivity(userId, 25),
      ]);

      return res.json({
        success: true,
        data: {
          days: heatmap.days,
          summary: {
            totalActiveDays: heatmap.totalActiveDays,
            currentStreak: heatmap.currentStreak,
            longestStreak: heatmap.longestStreak,
            totalActivities: heatmap.totalActivities,
          },
          recentTimeline: recent.map((item) => ({
            id: item.id,
            action: item.action,
            label: formatActivityLabel(item.action),
            createdAt: item.createdAt,
          })),
        },
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to load activity data.' },
      });
    }
  }

  static async getActivityHeatmap(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const daysParam = Number(req.query.days) || 365;
      const heatmap = await ActivityService.getActivityHeatmap(userId, daysParam);
      return res.json({
        success: true,
        data: heatmap,
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to load activity heatmap.' },
      });
    }
  }

  static async getRecentActivity(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const limit = Number(req.query.limit) || 25;
      const activities = await ActivityService.getRecentActivity(userId, limit);
      return res.json({
        success: true,
        data: { activities },
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to load recent activity.' },
      });
    }
  }

  static async recordClientActivity(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const action = req.body?.action as ActivityActionType;
      if (!action || !ALLOWED_CLIENT_ACTIVITIES.has(action)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Unsupported activity action.' },
        });
      }

      const metadata =
        req.body?.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata)
          ? req.body.metadata
          : undefined;

      await ActivityService.recordUserActivity(userId, action, metadata);
      return res.status(201).json({ success: true });
    } catch {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to record activity.' },
      });
    }
  }

  static async deleteAccount(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { currentPassword, confirmation } = req.body || {};
      await ProfileService.deleteAccount(userId, currentPassword, confirmation);
      clearAuthCookies(res);
      return res.json({
        success: true,
        message: 'Your account has been permanently deleted.',
      });
    } catch (err: any) {
      const { status, message } = parseError(err);
      return res.status(status).json({
        success: false,
        error: { message },
      });
    }
  }
}
