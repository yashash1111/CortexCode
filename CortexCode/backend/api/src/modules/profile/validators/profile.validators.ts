import { z } from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .max(300, 'URL is too long')
  .refine(
    (val) => !val || /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(val),
    'Must be a valid http:// or https:// URL'
  )
  .nullable()
  .optional();

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(80).optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_-]{3,30}$/, 'Username must be 3–30 characters (lowercase letters, numbers, _ or -)')
    .or(z.literal(''))
    .nullable()
    .optional(),
  developerRole: z.string().trim().max(80).nullable().optional(),
  bio: z.string().trim().max(500, 'Bio must be 500 characters or fewer').nullable().optional(),
  location: z.string().trim().max(100).nullable().optional(),
  websiteUrl: optionalUrl,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
});

export const updateSkillsSchema = z.object({
  skills: z
    .array(
      z.object({
        id: z.string().min(1).max(60),
        name: z.string().trim().min(1, 'Skill name is required').max(50),
        category: z.enum(['Language', 'Framework', 'Database', 'DevOps', 'Tool', 'Other']).default('Language'),
        level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).default('Intermediate'),
      })
    )
    .max(50, 'Maximum 50 skills allowed'),
});

export const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  accentColor: z.enum(['violet', 'indigo', 'blue', 'emerald', 'rose']).default('violet'),
  density: z.enum(['comfortable', 'compact']).default('comfortable'),
  reducedMotion: z.boolean().default(false),
});
