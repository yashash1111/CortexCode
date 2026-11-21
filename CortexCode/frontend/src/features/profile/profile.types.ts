import type { AccentColor, InterfaceDensity, ThemeMode } from '@/providers/ThemeProvider';

export interface ProfileSkill {
  id: string;
  name: string;
  category: 'language' | 'framework' | 'tool' | 'other';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface ProfilePreferences {
  theme: ThemeMode;
  accentColor: AccentColor;
  density: InterfaceDensity;
  reducedMotion: boolean;
}

export interface ProfileUser {
  id: string;
  name: string;
  username?: string | null;
  email: string;
  emailVerified: boolean;
  hasPassword?: boolean;
  avatarUrl?: string | null;
  developerRole?: string | null;
  bio?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  skills: ProfileSkill[];
  preferences: ProfilePreferences;
  role: string;
  createdAt: string;
}

export interface ProfileStats {
  totalConversations: number;
  totalCodeReviews: number;
  totalMockInterviews: number;
  totalActiveDays: number;
  currentStreak: number;
  longestStreak: number;
  totalActivities: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  breakdown: Record<string, number>;
}

export interface ActivityTimelineItem {
  id: string;
  action: string;
  label?: string;
  createdAt: string;
}

export interface ActivityResponse {
  startDate: string;
  endDate: string;
  totalActiveDays: number;
  currentStreak: number;
  longestStreak: number;
  totalActivities: number;
  days: HeatmapDay[];
  recentTimeline: ActivityTimelineItem[];
}
