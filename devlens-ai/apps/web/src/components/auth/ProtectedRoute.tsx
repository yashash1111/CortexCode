'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import WorkspaceLoader from '@/components/workspace/WorkspaceLoader';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUserProfile } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('cortexcode_user');
      if (!stored && !user) {
        // Auto-initialize guest session if unauthenticated so workspace ALWAYS loads
        const defaultUser = { name: 'Guest Developer', email: 'guest@cortexcode.ai' };
        setUserProfile(defaultUser);
      }
    }
  }, [user, setUserProfile]);

  if (!mounted) {
    return <WorkspaceLoader message="Loading CortexCode Workspace..." />;
  }

  return <>{children}</>;
};
