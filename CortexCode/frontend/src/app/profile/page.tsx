'use client';

import React from 'react';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ProfilePageContent } from '@/features/profile/ProfilePageContent';

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <DashboardShell
        title="Profile"
        subtitle="Personal developer profile, 365-day activity heatmap, skills, preferences, and security"
      >
        <ProfilePageContent />
      </DashboardShell>
    </ProtectedRoute>
  );
}
