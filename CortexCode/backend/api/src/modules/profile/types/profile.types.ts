export interface UserSkill {
  id: string;
  name: string;
  category: 'Language' | 'Framework' | 'Database' | 'DevOps' | 'Tool' | 'Other';
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  accentColor: 'violet' | 'indigo' | 'blue' | 'emerald' | 'rose';
  density: 'comfortable' | 'compact';
  reducedMotion: boolean;
}

export interface UpdateProfileInput {
  name?: string;
  username?: string | null;
  developerRole?: string | null;
  bio?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  breakdown: Record<string, number>;
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

export interface ActivityTimelineItem {
  id: string;
  action: string;
  label: string;
  createdAt: string;
  metadata?: unknown;
}
