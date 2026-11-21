'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  User as UserIcon, Activity, Code2, Sliders, Shield, Camera, Trash2,
  Edit3, Save, X, MapPin, Globe, GitBranch, ExternalLink, Calendar, Mail,
  CheckCircle2, MessageSquare, GitPullRequest, Briefcase, Flame, Trophy,
  Plus, Eye, EyeOff, LogOut, AlertTriangle, Loader2
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme, type AccentColor, type InterfaceDensity, type ThemeMode } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { getApiUrl } from '@/lib/apiConfig';
import { ActivityHeatmap } from './ActivityHeatmap';
import {
  changeAccountPassword,
  deleteUserAccount,
  fetchProfile,
  fetchProfileActivity,
  removeProfileAvatar,
  saveProfilePreferences,
  saveProfileSkills,
  updateProfileDetails,
  uploadProfileAvatar,
} from './profile.api';
import type {
  ActivityResponse,
  ProfileSkill,
  ProfileStats,
  ProfileUser,
} from './profile.types';

type ProfileTab = 'overview' | 'activity' | 'skills' | 'preferences' | 'security';

const ACCENT_OPTIONS: Array<{ id: AccentColor; label: string; swatch: string }> = [
  { id: 'purple', label: 'Purple', swatch: 'bg-purple-600' },
  { id: 'blue', label: 'Blue', swatch: 'bg-blue-600' },
  { id: 'emerald', label: 'Emerald', swatch: 'bg-emerald-600' },
  { id: 'rose', label: 'Rose', swatch: 'bg-rose-600' },
  { id: 'amber', label: 'Amber', swatch: 'bg-amber-600' },
];

function getPasswordStrength(pw: string): { label: string; score: number; color: string } {
  if (!pw) return { label: 'Enter password', score: 0, color: 'bg-[var(--bg-subtle)]' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  if (score <= 1) return { label: 'Weak', score: 25, color: 'bg-red-500' };
  if (score === 2) return { label: 'Fair', score: 50, color: 'bg-amber-500' };
  if (score === 3) return { label: 'Good', score: 75, color: 'bg-blue-500' };
  return { label: 'Strong', score: 100, color: 'bg-emerald-500' };
}

export function ProfilePageContent() {
  const toast = useToast();
  const { setUserProfile, logout } = useAuth();
  const {
    theme,
    accentColor,
    density,
    reducedMotion,
    setTheme,
    setAccentColor,
    setDensity,
    setReducedMotion,
  } = useTheme();

  const [tab, setTab] = useState<ProfileTab>('overview');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [activity, setActivity] = useState<ActivityResponse | null>(null);

  // Edit Profile State
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [form, setForm] = useState({
    name: '',
    username: '',
    developerRole: '',
    bio: '',
    location: '',
    websiteUrl: '',
    githubUrl: '',
    linkedinUrl: '',
  });
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Skills State
  const [skills, setSkills] = useState<ProfileSkill[]>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<ProfileSkill['category']>('language');
  const [newSkillLevel, setNewSkillLevel] = useState<ProfileSkill['level']>('intermediate');
  const [savingSkills, setSavingSkills] = useState(false);

  // Preferences State
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Security / Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchProfile(), fetchProfileActivity(365)])
      .then(([profRes, actRes]) => {
        if (!active) return;
        setProfile(profRes.user);
        setStats(profRes.stats);
        setActivity(actRes);
        setSkills(profRes.user.skills || []);
        setForm({
          name: profRes.user.name || '',
          username: profRes.user.username || '',
          developerRole: profRes.user.developerRole || '',
          bio: profRes.user.bio || '',
          location: profRes.user.location || '',
          websiteUrl: profRes.user.websiteUrl || '',
          githubUrl: profRes.user.githubUrl || '',
          linkedinUrl: profRes.user.linkedinUrl || '',
        });
        if (profRes.user.preferences) {
          setTheme(profRes.user.preferences.theme);
          setAccentColor(profRes.user.preferences.accentColor);
          setDensity(profRes.user.preferences.density);
          setReducedMotion(profRes.user.preferences.reducedMotion);
        }
      })
      .catch((err) => {
        if (!active) return;
        toast.showError('Failed to Load Profile', err?.response?.data?.error?.message || 'Please refresh the page.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.showError('Validation Error', 'Full name must be at least 2 characters.');
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await updateProfileDetails({
        name: form.name.trim(),
        username: form.username.trim() || null,
        developerRole: form.developerRole.trim() || null,
        bio: form.bio.trim() || null,
        location: form.location.trim() || null,
        websiteUrl: form.websiteUrl.trim() || null,
        githubUrl: form.githubUrl.trim() || null,
        linkedinUrl: form.linkedinUrl.trim() || null,
      });
      setProfile(updated);
      setUserProfile({ name: updated.name, avatarUrl: updated.avatarUrl || undefined });
      setEditing(false);
      toast.showSuccess('Profile Updated', 'Your profile details have been saved.');
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: { message?: string } } } };
      toast.showError('Update Failed', e2?.response?.data?.error?.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.showError('File Too Large', 'Avatar image must be under 2 MB.');
      return;
    }
    setUploadingAvatar(true);
    try {
      const updated = await uploadProfileAvatar(file);
      setProfile(updated);
      setUserProfile({ avatarUrl: updated.avatarUrl || undefined });
      toast.showSuccess('Avatar Updated', 'Your profile picture has been updated.');
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: { message?: string } } } };
      toast.showError('Upload Failed', e2?.response?.data?.error?.message || 'Could not upload image.');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const updated = await removeProfileAvatar();
      setProfile(updated);
      setUserProfile({ avatarUrl: undefined });
      toast.showSuccess('Avatar Removed', 'Your profile picture has been removed.');
    } catch {
      toast.showError('Remove Failed', 'Could not remove avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    const nextSkills: ProfileSkill[] = [
      ...skills,
      {
        id: `skill-${Date.now()}`,
        name: newSkillName.trim(),
        category: newSkillCategory,
        level: newSkillLevel,
      },
    ];
    setSavingSkills(true);
    try {
      const updated = await saveProfileSkills(nextSkills);
      setSkills(updated.skills || nextSkills);
      setNewSkillName('');
      toast.showSuccess('Skill Added', `${newSkillName.trim()} saved to your profile.`);
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: { message?: string } } } };
      toast.showError('Save Failed', e2?.response?.data?.error?.message || 'Could not save skill.');
    } finally {
      setSavingSkills(false);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    const nextSkills = skills.filter((s) => s.id !== skillId);
    setSavingSkills(true);
    try {
      const updated = await saveProfileSkills(nextSkills);
      setSkills(updated.skills || nextSkills);
      toast.showInfo('Skill Removed', 'Skill list updated.');
    } catch {
      toast.showError('Remove Failed', 'Could not update skills.');
    } finally {
      setSavingSkills(false);
    }
  };

  const persistPreferences = async (next: {
    theme: ThemeMode;
    accentColor: AccentColor;
    density: InterfaceDensity;
    reducedMotion: boolean;
  }) => {
    setTheme(next.theme);
    setAccentColor(next.accentColor);
    setDensity(next.density);
    setReducedMotion(next.reducedMotion);
    setSavingPrefs(true);
    try {
      await saveProfilePreferences(next);
      toast.showSuccess('Preferences Saved', 'Appearance preferences updated.');
    } catch {
      toast.showError('Sync Failed', 'Saved locally, but could not sync to server.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.showError('Validation Error', 'Current and new passwords are required.');
      return;
    }
    if (newPassword.length < 8) {
      toast.showError('Weak Password', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.showError('Mismatch', 'New password and confirmation do not match.');
      return;
    }
    setChangingPw(true);
    try {
      await changeAccountPassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.showSuccess('Password Updated', 'Your password has been changed securely.');
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: { message?: string } } } };
      toast.showError('Password Update Failed', e2?.response?.data?.error?.message || 'Incorrect current password.');
    } finally {
      setChangingPw(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteUserAccount(deletePassword || undefined);
      toast.showSuccess('Account Deleted', 'Your account has been permanently deleted.');
      await logout();
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: { message?: string } } } };
      toast.showError('Deletion Failed', e2?.response?.data?.error?.message || 'Could not delete account.');
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-36 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]" />
      </div>
    );
  }

  if (!profile || !stats) {
    return (
      <div className="p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] text-center text-sm text-[var(--text-muted)]">
        Unable to load your profile right now. Please sign in again.
      </div>
    );
  }

  const pwStrength = getPasswordStrength(newPassword);

  return (
    <div className="space-y-6 pb-10">
      {/* PROFILE HEADER CARD */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 min-w-0">
          {/* Avatar + Upload/Remove */}
          <div className="relative shrink-0 w-20 h-20">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl.startsWith('/') ? `${getApiUrl()}${profile.avatarUrl}` : profile.avatarUrl}
                alt={profile.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-[var(--accent-border)] shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-2xl font-black text-white shadow-md">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}

            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              title="Upload or change avatar"
              className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-xl bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-white shadow-md cursor-pointer"
            >
              {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--text-primary)] truncate">{profile.name}</h1>
              {profile.username && (
                <span className="text-xs font-mono text-[var(--accent-primary)]">@{profile.username}</span>
              )}
              {profile.emailVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--status-success-bg)] border border-[var(--status-success-border)] text-[10px] font-semibold text-[var(--status-success)]">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>

            <div className="text-sm text-[var(--text-secondary)]">
              {profile.developerRole || 'Software Developer'}
            </div>

            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] flex-wrap pt-1">
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {profile.email}
              </span>
              {profile.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {profile.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {profile.avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={uploadingAvatar}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--status-error-bg)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--status-error)] transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove Photo
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setTab('overview');
              setEditing((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {editing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {/* PROFILE STATISTICS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'AI Conversations', value: stats.totalConversations, icon: MessageSquare, href: '/workspace' },
          { label: 'Code Reviews', value: stats.totalCodeReviews, icon: GitPullRequest, href: '/github' },
          { label: 'Mock Interviews', value: stats.totalMockInterviews, icon: Briefcase, href: '/workspace' },
          { label: 'Active Days', value: stats.totalActiveDays, icon: Calendar },
          { label: 'Current Streak', value: `${stats.currentStreak}d`, icon: Flame },
          { label: 'Longest Streak', value: `${stats.longestStreak}d`, icon: Trophy },
        ].map((item) => {
          const Icon = item.icon;
          const card = (
            <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--accent-border)] transition-colors h-full">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1.5">
                <span className="truncate">{item.label}</span>
                <Icon className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">{item.value}</div>
            </div>
          );
          return item.href ? (
            <Link key={item.label} href={item.href} className="block">
              {card}
            </Link>
          ) : (
            <div key={item.label}>{card}</div>
          );
        })}
      </div>

      {/* 5 PROFILE TABS */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border-default)] overflow-x-auto scrollbar-none pb-2">
        {[
          { id: 'overview' as ProfileTab, label: 'Overview', icon: UserIcon },
          { id: 'activity' as ProfileTab, label: 'Activity', icon: Activity },
          { id: 'skills' as ProfileTab, label: 'Skills', icon: Code2 },
          { id: 'preferences' as ProfileTab, label: 'Preferences', icon: Sliders },
          { id: 'security' as ProfileTab, label: 'Security', icon: Shield },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === 'overview' && (
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-5">
          {editing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                    placeholder="e.g. yashash_dev"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Developer Role</label>
                  <input
                    type="text"
                    value={form.developerRole}
                    onChange={(e) => setForm({ ...form, developerRole: e.target.value })}
                    placeholder="Full Stack Developer"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Bengaluru, India"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Website / Portfolio URL</label>
                  <input
                    type="url"
                    value={form.websiteUrl}
                    onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                    placeholder="https://yourportfolio.dev"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">GitHub URL</label>
                  <input
                    type="url"
                    value={form.githubUrl}
                    onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                    placeholder="https://github.com/username"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={form.linkedinUrl}
                    onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Short Bio</label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Tell others what you are building and learning..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] resize-y"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Profile
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)] mb-1">About</h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {profile.bio || 'No bio added yet. Click "Edit Profile" to add your developer bio and links.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border-default)] text-xs">
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-[var(--text-muted)]">Website</div>
                    {profile.websiteUrl ? (
                      <a href={profile.websiteUrl} target="_blank" rel="noreferrer" className="text-[var(--accent-primary)] hover:underline truncate block">
                        {profile.websiteUrl}
                      </a>
                    ) : (
                      <span className="text-[var(--text-muted)]">Not set</span>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] flex items-center gap-2.5">
                  <GitBranch className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-[var(--text-muted)]">GitHub</div>
                    {profile.githubUrl ? (
                      <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="text-[var(--accent-primary)] hover:underline truncate block">
                        {profile.githubUrl}
                      </a>
                    ) : (
                      <span className="text-[var(--text-muted)]">Not set</span>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] flex items-center gap-2.5">
                  <ExternalLink className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-[var(--text-muted)]">LinkedIn</div>
                    {profile.linkedinUrl ? (
                      <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="text-[var(--accent-primary)] hover:underline truncate block">
                        {profile.linkedinUrl}
                      </a>
                    ) : (
                      <span className="text-[var(--text-muted)]">Not set</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVITY */}
      {tab === 'activity' && activity && (
        <div className="space-y-5">
          <ActivityHeatmap activity={activity} />

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Recent Activity Timeline</h3>
            {activity.recentTimeline.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No recent activities recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {activity.recentTimeline.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-xs"
                  >
                    <span className="font-medium text-[var(--text-primary)]">{item.label || item.action.replace(/_/g, ' ')}</span>
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SKILLS */}
      {tab === 'skills' && (
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-5">
          <form onSubmit={handleAddSkill} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="Add skill (e.g. TypeScript, Spring Boot)"
              className="sm:col-span-2 px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            />
            <select
              value={newSkillCategory}
              onChange={(e) => setNewSkillCategory(e.target.value as ProfileSkill['category'])}
              className="px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-[var(--text-primary)] outline-none"
            >
              {(['language', 'framework', 'tool', 'other'] as const).map((c) => (
                <option key={c} value={c} className="capitalize">{c}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(e.target.value as ProfileSkill['level'])}
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-[var(--text-primary)] outline-none capitalize"
              >
                {(['beginner', 'intermediate', 'advanced', 'expert'] as const).map((l) => (
                  <option key={l} value={l} className="capitalize">{l}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={savingSkills || !newSkillName.trim()}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </form>

          {skills.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No skills added yet. Add your languages, frameworks, and tools above.</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-xs"
                >
                  <span className="font-semibold text-[var(--text-primary)]">{skill.name}</span>
                  <span className="text-[10px] text-[var(--accent-primary)]">{skill.category} · {skill.level}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill.id)}
                    disabled={savingSkills}
                    className="p-0.5 text-[var(--text-muted)] hover:text-[var(--status-error)] cursor-pointer"
                    title="Remove skill"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PREFERENCES */}
      {tab === 'preferences' && (
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Appearance & Interface</h2>
              <p className="text-xs text-[var(--text-muted)]">Changes apply immediately across CortexCode.</p>
            </div>
            {savingPrefs && <span className="text-xs text-[var(--accent-primary)]">Saving...</span>}
          </div>

          {/* Theme Mode */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">Theme Mode</label>
            <div className="flex flex-wrap gap-2">
              {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => persistPreferences({ theme: mode, accentColor, density, reducedMotion })}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border capitalize cursor-pointer ${
                    theme === mode
                      ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-primary)]'
                      : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)]'
                  }`}
                >
                  {mode === 'system' ? 'System Default' : `${mode} Mode`}
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">Accent Color</label>
            <div className="flex flex-wrap gap-2.5">
              {ACCENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => persistPreferences({ theme, accentColor: opt.id, density, reducedMotion })}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                    accentColor === opt.id
                      ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-primary)]'
                      : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)]'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${opt.swatch}`} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interface Density & Reduced Motion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-default)]">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">Interface Density</label>
              <div className="flex gap-2">
                {(['comfortable', 'compact'] as InterfaceDensity[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => persistPreferences({ theme, accentColor, density: d, reducedMotion })}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border capitalize cursor-pointer ${
                      density === d
                        ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-primary)]'
                        : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">Reduced Motion</label>
              <div className="flex gap-2">
                {[false, true].map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => persistPreferences({ theme, accentColor, density, reducedMotion: val })}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                      reducedMotion === val
                        ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-primary)]'
                        : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {val ? 'On' : 'Off'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY */}
      {tab === 'security' && (
        <div className="space-y-5">
          <form
            onSubmit={handleChangePassword}
            className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4"
          >
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Change Password</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2 pr-9 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 pr-9 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
            </div>

            {newPassword && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                  <span>Password strength</span>
                  <span>{pwStrength.label}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                  <div className={`h-full ${pwStrength.color} transition-all`} style={{ width: `${pwStrength.score}%` }} />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changingPw}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {changingPw && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Update Password
              </button>
            </div>
          </form>

          {/* Email & Account Actions */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-[var(--text-primary)]">Email & Account Session</div>
              <p className="text-xs text-[var(--text-muted)]">
                Signed in as <strong className="text-[var(--text-primary)]">{profile.email}</strong> ({profile.emailVerified ? 'Verified' : 'Unverified'}) · Role: {profile.role}
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--status-error-bg)] border border-[var(--status-error-border)] text-xs font-semibold text-[var(--status-error)] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--modal-bg)] border border-[var(--status-error-border)] shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-[var(--status-error)]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold">Delete Your Account?</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This permanently deletes your profile, conversations, mock interview reports, and activity history. This action cannot be undone.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password to confirm (if set)"
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {deletingAccount ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
