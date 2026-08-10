'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, ArrowLeft, ShieldAlert, CheckCircle2, Sparkles } from 'lucide-react';
import BackgroundVideo from '@/components/BackgroundVideo';
import { useToast } from '@/providers/ToastProvider';

export default function LogoutConfirmationPage() {
  const router = useRouter();
  const toast = useToast();
  const [loggingOut, setLoggingOut] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  const handleConfirmLogout = () => {
    setLoggingOut(true);

    setTimeout(() => {
      // Clear tokens and active user session data
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      setLoggedOut(true);
      toast.showSuccess('Signed Out Successfully', 'Your session data and API tokens are safely secured.');

      setTimeout(() => {
        router.push('/login');
      }, 1500);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-6 text-white font-sans overflow-hidden">
      <BackgroundVideo variant="auth" />

      {/* Floating Header Back to Workspace */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/workspace"
          className="flex items-center gap-2 px-4 py-2 bg-black/50 hover:bg-black/80 border border-white/10 rounded-full text-xs font-bold text-zinc-300 hover:text-white transition-all backdrop-blur-md"
        >
          <ArrowLeft size={14} /> Back to Workspace
        </Link>
      </div>

      {/* Interactive Glass Logout Confirmation Card */}
      <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_0_80px_rgba(0,0,0,0.9)] z-10 animate-fade-in-up text-center relative overflow-hidden">
        
        {/* Emblem */}
        <div className="relative w-16 h-16 mx-auto mb-6 flex items-center justify-center">
          <div className="w-full h-full rounded-2xl bg-zinc-900 border border-white/15 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center">
            {loggedOut ? (
              <CheckCircle2 size={30} className="text-emerald-400 animate-bounce" />
            ) : (
              <LogOut size={28} className="text-red-400" />
            )}
          </div>
        </div>

        {loggedOut ? (
          <div className="space-y-4 animate-fade-in-up">
            <h1 className="text-2xl font-black text-white">Signed Out</h1>
            <p className="text-emerald-300 text-xs font-medium bg-emerald-950/50 border border-emerald-500/30 p-3 rounded-xl backdrop-blur-md">
              ✓ Session ended safely. Redirecting to login screen...
            </p>
          </div>
        ) : (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
              CortexCode Session Management
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Confirm Sign Out</h1>
            <p className="text-zinc-300 text-xs font-medium leading-relaxed mb-8">
              Are you sure you want to end your current developer session? Your active vector indexes and API keys remain safely encrypted.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={loggingOut}
                className="w-full py-3.5 bg-red-600/90 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all duration-300 shadow-[0_0_25px_rgba(220,38,38,0.3)] transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 border border-red-500/30"
              >
                <LogOut size={16} /> {loggingOut ? 'Signing Out...' : 'Confirm Sign Out'}
              </button>

              <Link
                href="/workspace"
                className="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold transition-all text-zinc-300 hover:text-white block text-center backdrop-blur-md"
              >
                Cancel / Return to Workspace
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
