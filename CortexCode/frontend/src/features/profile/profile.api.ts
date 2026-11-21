import { apiClient } from '@/lib/apiClient';
import type {
  ActivityResponse,
  ProfilePreferences,
  ProfileSkill,
  ProfileStats,
  ProfileUser,
} from './profile.types';

export async function fetchProfile(): Promise<{ user: ProfileUser; stats: ProfileStats }> {
  const res = await apiClient.get('/api/profile');
  return {
    user: res.data.data.user ?? res.data.data.profile,
    stats: res.data.data.stats,
  };
}

export async function updateProfileDetails(payload: {
  name?: string;
  username?: string | null;
  developerRole?: string | null;
  bio?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
}): Promise<ProfileUser> {
  const res = await apiClient.patch('/api/profile', payload);
  return res.data.data.user ?? res.data.data.profile;
}

export async function uploadProfileAvatar(file: File): Promise<ProfileUser> {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await apiClient.post('/api/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.user ?? res.data.data.profile;
}

export async function removeProfileAvatar(): Promise<ProfileUser> {
  const res = await apiClient.delete('/api/profile/avatar');
  return res.data.data.user ?? res.data.data.profile;
}

export async function saveProfileSkills(skills: ProfileSkill[]): Promise<ProfileUser> {
  const res = await apiClient.put('/api/profile/skills', { skills });
  return res.data.data.user ?? res.data.data.profile;
}

export async function saveProfilePreferences(preferences: ProfilePreferences): Promise<ProfileUser> {
  const res = await apiClient.patch('/api/profile/preferences', preferences);
  return res.data.data.user ?? res.data.data.profile;
}

export async function fetchProfileActivity(days: number = 365): Promise<ActivityResponse> {
  const [heatmapRes, recentRes] = await Promise.all([
    apiClient.get(`/api/profile/activity/heatmap?days=${days}`),
    apiClient.get('/api/profile/activity/recent?limit=25'),
  ]);
  return {
    ...heatmapRes.data.data,
    recentTimeline: recentRes.data.data.activities || [],
  };
}

export async function changeAccountPassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiClient.post('/api/auth/change-password', payload);
}

export async function deleteUserAccount(currentPassword?: string): Promise<void> {
  await apiClient.delete('/api/profile/account', {
    data: { currentPassword, confirmation: 'DELETE' },
  });
}
