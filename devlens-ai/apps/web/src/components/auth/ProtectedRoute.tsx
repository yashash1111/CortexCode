'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';

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
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white font-mono text-xs uppercase tracking-widest">
        Loading Workspace...
      </div>
    );
  }

  return <>{children}</>;
};
