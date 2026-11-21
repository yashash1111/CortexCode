import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma';
import { verifyPassword } from '../../../shared/utils/password';
import { revokeUserSessions } from '../../users/services/securityService';
import { ActivityService } from './activity.service';

export const AVATAR_UPLOAD_DIR = path.resolve(__dirname, '../../../../uploads/avatars');
const LOCAL_AVATAR_PREFIX = '/api/profile/avatar/';

const optionalUrlSchema = z
  .string()
  .trim()
  .max(255)
  .refine(
    (val) => val === '' || /^https?:\/\/.+/i.test(val),
    { message: 'URL must start with http:// or https://' }
  )
  .optional()
  .nullable();

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required').max(100, 'Full name must be under 100 characters'),
  username: z
    .string()
    .trim()
    .refine((val) => val === '' || /^[a-zA-Z0-9_-]{3,30}$/.test(val), {
      message: 'Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens',
    })
    .optional()
    .nullable(),
  developerRole: z.string().trim().max(100, 'Developer role must be under 100 characters').optional().nullable(),
  bio: z.string().trim().max(500, 'Bio must be under 500 characters').optional().nullable(),
  location: z.string().trim().max(100, 'Location must be under 100 characters').optional().nullable(),
  websiteUrl: optionalUrlSchema,
  githubUrl: optionalUrlSchema,
  linkedinUrl: optionalUrlSchema,
});

export const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  accentColor: z.enum(['purple', 'blue', 'emerald', 'rose', 'amber']).optional(),
  density: z.enum(['comfortable', 'compact']).optional(),
  reducedMotion: z.boolean().optional(),
});

export const skillItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1, 'Skill name is required').max(50, 'Skill name must be under 50 characters'),
  category: z.enum([
    'Language', 'Framework', 'Database', 'DevOps', 'Tool', 'Other',
    'language', 'framework', 'database', 'devops', 'tool', 'other',
  ]).default('Language'),
  level: z.enum([
    'Beginner', 'Intermediate', 'Advanced', 'Expert',
    'beginner', 'intermediate', 'advanced', 'expert',
  ]).default('Intermediate'),
});

export const updateSkillsSchema = z.object({
  skills: z.array(skillItemSchema).max(50, 'Maximum 50 skills allowed'),
});

export type UserPreferences = {
  theme: 'light' | 'dark' | 'system';
  accentColor: 'purple' | 'blue' | 'emerald' | 'rose' | 'amber';
  density: 'comfortable' | 'compact';
  reducedMotion: boolean;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  accentColor: 'purple',
  density: 'comfortable',
  reducedMotion: false,
};

function sanitizeNullableString(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed === '' ? null : trimmed;
}

export function deleteLocalAvatarFile(avatarUrl?: string | null): void {
  if (!avatarUrl || !avatarUrl.startsWith(LOCAL_AVATAR_PREFIX)) return;
  const filename = path.basename(avatarUrl.slice(LOCAL_AVATAR_PREFIX.length));
  if (!/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|gif)$/i.test(filename)) return;
  const filePath = path.join(AVATAR_UPLOAD_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn('[ProfileService] Failed to delete old avatar file:', err instanceof Error ? err.message : err);
  }
}

function formatSafeUser(user: {
  id: string;
  name: string;
  username: string | null;
  email: string;
  emailVerified: boolean;
  passwordHash: string | null;
  avatarUrl: string | null;
  developerRole: string | null;
  bio: string | null;
  location: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  skills: Prisma.JsonValue | null;
  preferences: Prisma.JsonValue | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const rawPrefs = (user.preferences && typeof user.preferences === 'object' && !Array.isArray(user.preferences)
    ? user.preferences
    : {}) as Record<string, unknown>;

  const preferences: UserPreferences = {
    theme:
      rawPrefs.theme === 'light' || rawPrefs.theme === 'dark' || rawPrefs.theme === 'system'
        ? rawPrefs.theme
        : DEFAULT_PREFERENCES.theme,
    accentColor:
      rawPrefs.accentColor === 'purple' ||
      rawPrefs.accentColor === 'blue' ||
      rawPrefs.accentColor === 'emerald' ||
      rawPrefs.accentColor === 'rose' ||
      rawPrefs.accentColor === 'amber'
        ? rawPrefs.accentColor
        : DEFAULT_PREFERENCES.accentColor,
    density: rawPrefs.density === 'compact' || rawPrefs.density === 'comfortable'
      ? rawPrefs.density
      : DEFAULT_PREFERENCES.density,
    reducedMotion: typeof rawPrefs.reducedMotion === 'boolean' ? rawPrefs.reducedMotion : DEFAULT_PREFERENCES.reducedMotion,
  };

  const skills = Array.isArray(user.skills) ? user.skills : [];

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    emailVerified: user.emailVerified,
    hasPassword: Boolean(user.passwordHash),
    avatarUrl: user.avatarUrl,
    developerRole: user.developerRole,
    bio: user.bio,
    location: user.location,
    websiteUrl: user.websiteUrl,
    githubUrl: user.githubUrl,
    linkedinUrl: user.linkedinUrl,
    skills,
    preferences,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class ProfileService {
  static async recordActivity(
    userId: string,
    action: string,
    metadata?: Record<string, unknown>,
    repositoryId?: string
  ): Promise<void> {
    return ActivityService.recordUserActivity(userId, action, metadata, repositoryId);
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    return formatSafeUser(user);
  }

  static async getProfileStats(userId: string) {
    const [totalConversations, prReviewCount, chatReviewCount, totalMockInterviews, heatmap] = await Promise.all([
      prisma.conversation.count({ where: { userId } }),
      prisma.pullRequestReview.count({ where: { pullRequest: { repository: { userId } } } }),
      prisma.activityLog.count({ where: { userId, action: 'code_review' } }),
      prisma.mockInterviewSession.count({ where: { userId } }),
      ActivityService.getActivityHeatmap(userId, 365),
    ]);

    return {
      totalConversations,
      totalCodeReviews: prReviewCount + chatReviewCount,
      totalMockInterviews,
      totalActiveDays: heatmap.totalActiveDays,
      currentStreak: heatmap.currentStreak,
      longestStreak: heatmap.longestStreak,
      totalActivities: heatmap.totalActivities,
    };
  }

  static async updateProfile(userId: string, rawInput: unknown) {
    const data = updateProfileSchema.parse(rawInput);
    const normalizedUsername = sanitizeNullableString(data.username);

    if (normalizedUsername) {
      const existing = await prisma.user.findFirst({
        where: {
          username: normalizedUsername,
          NOT: { id: userId },
        },
        select: { id: true },
      });
      if (existing) {
        const err = new Error('This username is already taken.');
        (err as any).status = 409;
        throw err;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        username: normalizedUsername,
        developerRole: sanitizeNullableString(data.developerRole),
        bio: sanitizeNullableString(data.bio),
        location: sanitizeNullableString(data.location),
        websiteUrl: sanitizeNullableString(data.websiteUrl),
        githubUrl: sanitizeNullableString(data.githubUrl),
        linkedinUrl: sanitizeNullableString(data.linkedinUrl),
      },
    });

    return formatSafeUser(updated);
  }

  static async updateAvatar(userId: string, newAvatarUrl: string | null) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (existing?.avatarUrl && existing.avatarUrl !== newAvatarUrl) {
      deleteLocalAvatarFile(existing.avatarUrl);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: newAvatarUrl },
    });

    return formatSafeUser(updated);
  }

  static async updatePreferences(userId: string, rawInput: unknown) {
    const data = preferencesSchema.parse(rawInput);
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const existingPrefs =
      current?.preferences && typeof current.preferences === 'object' && !Array.isArray(current.preferences)
        ? (current.preferences as Record<string, unknown>)
        : {};

    const merged: UserPreferences = {
      theme: data.theme ?? (existingPrefs.theme as UserPreferences['theme']) ?? DEFAULT_PREFERENCES.theme,
      accentColor:
        data.accentColor ?? (existingPrefs.accentColor as UserPreferences['accentColor']) ?? DEFAULT_PREFERENCES.accentColor,
      density: data.density ?? (existingPrefs.density as UserPreferences['density']) ?? DEFAULT_PREFERENCES.density,
      reducedMotion:
        typeof data.reducedMotion === 'boolean'
          ? data.reducedMotion
          : typeof existingPrefs.reducedMotion === 'boolean'
            ? existingPrefs.reducedMotion
            : DEFAULT_PREFERENCES.reducedMotion,
    };

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { preferences: merged as unknown as Prisma.InputJsonValue },
    });

    return formatSafeUser(updated);
  }

  static async updateSkills(userId: string, rawInput: unknown) {
    const { skills } = updateSkillsSchema.parse(rawInput);

    // Deduplicate case-insensitively by name
    const seen = new Set<string>();
    const deduped = skills.filter((s) => {
      const key = s.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { skills: deduped as unknown as Prisma.InputJsonValue },
    });

    return formatSafeUser(updated);
  }

  static async deleteAccount(userId: string, currentPassword?: string, confirmation?: string) {
    if (confirmation !== undefined && confirmation !== 'DELETE') {
      const err = new Error('Please type DELETE to confirm account deletion.');
      (err as any).status = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const err = new Error('User account not found.');
      (err as any).status = 404;
      throw err;
    }

    if (user.passwordHash) {
      if (!currentPassword) {
        const err = new Error('Current password is required to delete your account.');
        (err as any).status = 400;
        throw err;
      }
      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) {
        const err = new Error('Current password is incorrect.');
        (err as any).status = 401;
        throw err;
      }
    }

    deleteLocalAvatarFile(user.avatarUrl);
    await revokeUserSessions(userId);
    await prisma.user.delete({ where: { id: userId } });
  }
}
