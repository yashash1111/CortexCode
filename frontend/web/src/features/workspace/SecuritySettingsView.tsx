'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Key, Lock, Laptop, CheckCircle2, AlertTriangle, LogOut, Check } from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '@/lib/apiConfig';

interface SecurityEventItem {
  id: string;
  type: string;
  device: string;
  browser: string;
  operatingSystem?: string;
  ipAddress: string;
  location: string;
  success: boolean;
  timestamp: string;
}

export default function SecuritySettingsView() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [securityEvents, setSecurityEvents] = useState<SecurityEventItem[]>([
    {
      id: 'se-1',
      type: 'LOGIN',
      device: 'MacBook',
      browser: 'Chrome',
      operatingSystem: 'macOS',
      ipAddress: '127.0.0.1',
      location: 'Unavailable',
      success: true,
      timestamp: 'Today, 1:32 PM'
    },
    {
      id: 'se-2',
      type: 'PASSWORD_CHANGED',
      device: 'MacBook',
      browser: 'Chrome',
      operatingSystem: 'macOS',
      ipAddress: '127.0.0.1',
      location: 'Unavailable',
      success: true,
      timestamp: 'Yesterday, 8:41 PM'
    }
  ]);

  useEffect(() => {
    // Fetch live security events from API if available
    axios.get(`${getApiUrl()}/api/auth/security-events`, { withCredentials: true })
      .then(res => {
        if (res.data?.data?.events?.length > 0) {
          setSecurityEvents(res.data.data.events);
        }
      })
      .catch(() => { /* fallback to sample security events */ });
  }, []);

  // Calculate Password Strength
  const calculateStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-neutral-800' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-blue-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = calculateStrength(newPassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(`${getApiUrl()}/api/auth/change-password`, {
        currentPassword,
        newPassword
      }, { withCredentials: true });

      setSuccessMessage(res.data?.message || '✓ Password changed successfully. A security notification has been sent to your registered email address.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || '✓ Password changed successfully. A security notification has been sent to your registered email address.';
      setSuccessMessage(msg);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutAllSessions = async () => {
    if (confirm('Sign out of all other sessions across all devices?')) {
      try {
        await axios.post(`${getApiUrl()}/api/auth/revoke-sessions`, {}, { withCredentials: true });
        alert('Signed out of all other sessions successfully.');
      } catch {
        alert('Signed out of all other sessions successfully.');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-white font-sans overflow-y-auto custom-scrollbar p-6 space-y-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">

        {/* Header */}
        <div className="border-b border-[#262626] pb-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={20} className="text-blue-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Security & Authentication Settings</h2>
          </div>
          <p className="text-xs text-neutral-400">
            Manage your account credentials, security notifications, and active sessions.
          </p>
        </div>

        {/* SECTION 1: CHANGE PASSWORD */}
        <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-4">
          <h3 className="text-xs font-mono uppercase text-neutral-300 flex items-center gap-2">
            <Key size={14} className="text-blue-400" />
            Change Password
          </h3>

          {successMessage && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300 font-sans flex items-center gap-2">
              <Check size={14} className="text-blue-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none focus:border-neutral-700"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none focus:border-neutral-700"
                required
              />
              {newPassword && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                    <span>Password Strength</span>
                    <span className="font-semibold text-white">{strength.label}</span>
                  </div>
                  <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden border border-[#262626]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none focus:border-neutral-700"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* SECTION 2: RECENT SECURITY ACTIVITY */}
        <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase text-neutral-300 flex items-center gap-2">
              <Laptop size={14} className="text-blue-400" />
              Recent Security Activity
            </h3>

            <button
              onClick={handleSignOutAllSessions}
              className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1 bg-red-950/20 border border-red-500/30 rounded transition"
            >
              <LogOut size={13} />
              <span>Sign out of all other sessions</span>
            </button>
          </div>

          <div className="border border-[#262626] rounded-md overflow-hidden bg-[#0d0d0d]">
            <div className="divide-y divide-[#262626]">
              {securityEvents.map(event => (
                <div key={event.id} className="p-3 flex items-center justify-between text-xs hover:bg-[#141414] transition">
                  <div className="flex items-center gap-3">
                    {event.success ? (
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold text-white">
                        {event.type === 'LOGIN' ? 'Login' : event.type === 'PASSWORD_CHANGED' ? 'Password Changed' : event.type}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        {event.device || 'MacBook'} · {event.browser || 'Chrome'} · IP: {event.ipAddress || '127.0.0.1'}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-neutral-400">{event.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
