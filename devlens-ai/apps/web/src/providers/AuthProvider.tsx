'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';

export interface User {
  id?: string;
  name: string;
  email: string;
  role?: string;
  avatarUrl?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUserProfile: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  // Verify existing session on application startup
  const checkAuth = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/auth/me');
      if (response.data?.success && response.data?.data?.user) {
        const currentUser = response.data.data.user;
        setUser(currentUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('cortexcode_user', JSON.stringify(currentUser));
        }
      } else {
        setUser(null);
      }
    } catch {
      // Fallback check to stored session user if offline
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('cortexcode_user');
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/api/auth/login', { email, password });
      if (response.data?.success) {
        const authenticatedUser = response.data.data.user || { name: email.split('@')[0], email };
        setUser(authenticatedUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('cortexcode_user', JSON.stringify(authenticatedUser));
        }
      } else {
        throw new Error(response.data?.error?.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/api/auth/register', { name, email, password });
      if (response.data?.success) {
        const registeredUser = response.data.data.user || { name, email };
        setUser(registeredUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('cortexcode_user', JSON.stringify(registeredUser));
        }
      } else {
        throw new Error(response.data?.error?.message || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiClient.post('/api/auth/logout').catch(() => {});
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cortexcode_user');
      }
      setLoading(false);
      router.push('/login');
    }
  };

  const setUserProfile = (userData: Partial<User>) => {
    setUser(prev => {
      const updated = prev ? { ...prev, ...userData } : (userData as User);
      if (typeof window !== 'undefined') {
        localStorage.setItem('cortexcode_user', JSON.stringify(updated));
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        checkAuth,
        setUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
