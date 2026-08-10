'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Eye, EyeOff, ArrowLeft, Zap, Lock, Mail, GitBranch } from 'lucide-react';
import BackgroundVideo from '@/components/BackgroundVideo';
import { signInWithGoogleFirebase, signInWithGitHubFirebase } from '@/lib/firebase';
import { useToast } from '@/providers/ToastProvider';
import { getApiUrl } from '@/lib/apiConfig';
import { useAuth } from '@/providers/AuthProvider';
import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { login } = useAuth();

  const redirectTarget = searchParams.get('redirect') || '/workspace';

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('registered_credentials');
      if (saved) {
        const { email: savedEmail, password: savedPassword } = JSON.parse(saved);
        if (savedEmail) setEmail(savedEmail);
        if (savedPassword) setPassword(savedPassword);
        sessionStorage.removeItem('registered_credentials');
        toast.showInfo('Credentials Auto-filled', 'Account created! Click Sign In to launch your workspace.');
      }
    } catch { /* ignore */ }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      toast.showSuccess('Signed In Successfully!', 'Launching your AI developer workspace...');
      router.push(redirectTarget);
    } catch (err: any) {
      let msg = 'Invalid email or password.';
      if (err.response?.data?.error) {
        const errData = err.response.data.error;
        if (typeof errData === 'string') msg = errData;
        else if (typeof errData.message === 'string') msg = errData.message;
      } else if (err.message) {
        msg = err.message;
      }
      msg = String(msg).replace(/^\{|\}$|^\[|\]$/g, '').trim();
      setError(msg);
      toast.showError('Authentication Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    setLoading(true);
    setError('');
    try {
      const { user } = await signInWithGoogleFirebase();
      if (!user || !user.email) {
        throw new Error('Google Sign-In popup did not return a valid email address.');
      }
      const userEmail = user.email;
      const userName = user.displayName || userEmail.split('@')[0];

      setUserProfile({ name: userName, email: userEmail });

      try {
        try {
          await apiClient.post('/api/auth/login', {
            email: userEmail,
            password: 'FirebaseOAuthSecret123!'
          });
        } catch {
          await apiClient.post('/api/auth/register', {
            name: userName,
            email: userEmail,
            password: 'FirebaseOAuthSecret123!'
          });
        }
      } catch { /* ignore fallback */ }

      toast.showSuccess('Google Auth Verified', `Welcome back, ${userName}!`);
      router.push(redirectTarget);
    } catch (err: any) {
      const msg = err?.message || 'Google sign-in was cancelled.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubFirebaseLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { user } = await signInWithGitHubFirebase();
      if (!user || !user.email) {
        throw new Error('GitHub Sign-In popup did not return a valid email address.');
      }
      const userEmail = user.email;
      const userName = user.displayName || userEmail.split('@')[0];

      setUserProfile({ name: userName, email: userEmail });

      try {
        try {
          await apiClient.post('/api/auth/login', {
            email: userEmail,
            password: 'FirebaseOAuthSecret123!'
          });
        } catch {
          await apiClient.post('/api/auth/register', {
            name: userName,
            email: userEmail,
            password: 'FirebaseOAuthSecret123!'
          });
        }
      } catch { /* ignore fallback */ }

      toast.showSuccess('GitHub Auth Verified', `Welcome back, ${userName}!`);
      router.push(redirectTarget);
    } catch (err: any) {
      const msg = err?.message || 'GitHub sign-in was cancelled.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setEmail('guest@cortexcode.ai');
    setPassword('password123');
    setLoading(true);
    setError('');

    const guestUser = { name: 'Guest Developer', email: 'guest@cortexcode.ai' };
    localStorage.setItem('cortexcode_user', JSON.stringify(guestUser));
    localStorage.setItem('accessToken', 'demo_guest_access_token');
    localStorage.setItem('refreshToken', 'demo_guest_refresh_token');

    try {
      await axios.post(`${getApiUrl()}/api/auth/register`, {
        name: 'Guest Developer',
        email: 'guest@cortexcode.ai',
        password: 'password123',
      }).catch(() => {});
    } catch { /* ignore */ }

    toast.showSuccess('1-Click Guest Demo Active', 'Logged in as guest@cortexcode.ai');
    router.push('/workspace');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-6 text-white font-sans overflow-hidden">
      <BackgroundVideo variant="home" />

      {/* Dark gradient overlay for video integration */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70 pointer-events-none" />

      {/* Back Link */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/80 border border-white/15 rounded-full text-xs font-bold text-zinc-300 hover:text-white transition-all backdrop-blur-md"
        >
          <ArrowLeft size={14} /> Home
        </Link>
      </div>

      {/* Brand Header — above the card */}
      <div className="z-10 flex flex-col items-center mb-6 text-center">
        <div className="flex items-center gap-3 mb-2">
          <img
            src="/logo.jpg"
            alt="CortexCode"
            className="w-11 h-11 rounded-xl border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.8)] object-cover"
          />
          <h1 className="text-4xl font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
            CortexCode
          </h1>
        </div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          AI Developer Workspace
        </p>
      </div>

      {/* Glass Login Card */}
      <div className="w-full max-w-md bg-zinc-950/85 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 shadow-[0_20px_80px_rgba(0,0,0,0.9)] z-10 animate-fade-in-up">

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-white mb-1">Welcome back</h2>
          <p className="text-zinc-400 text-xs font-medium">Sign in to your intelligent coding workspace</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-950/70 border border-red-500/40 text-red-200 rounded-xl text-xs backdrop-blur-md font-medium">
            {error}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={handleGoogleOAuth}
            disabled={loading}
            className="flex items-center justify-center gap-2.5 py-3 px-4 bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 hover:border-white/30 rounded-xl text-xs font-bold text-zinc-200 hover:text-white transition-all backdrop-blur-md disabled:opacity-50 shadow-sm"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
              <path fill="#FBBC05" d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z" />
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
            </svg>
            Google
          </button>

          <button
            type="button"
            onClick={handleGitHubFirebaseLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2.5 py-3 px-4 bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 hover:border-white/30 rounded-xl text-xs font-bold text-zinc-200 hover:text-white transition-all backdrop-blur-md disabled:opacity-50 shadow-sm"
          >
            <GitBranch size={16} className="text-zinc-300 shrink-0" />
            GitHub
          </button>
        </div>

        <div className="relative flex items-center justify-center mb-5">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-zinc-950 px-3 text-[10px] uppercase font-bold text-zinc-400 shrink-0">
            or continue with email
          </span>
          <div className="border-t border-white/10 w-full" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 pl-11 bg-zinc-900/90 border border-white/15 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 text-white placeholder-zinc-500 backdrop-blur-md outline-none transition-all text-sm"
                placeholder="you@example.com"
                required
              />
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">Password</label>
              <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors">Forgot Password?</Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 pl-11 pr-12 bg-zinc-900/90 border border-white/15 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 text-white placeholder-zinc-500 backdrop-blur-md outline-none transition-all text-sm"
                placeholder="••••••••"
                required
              />
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/30 rounded-xl font-bold text-sm transition-all duration-300 shadow-[0_4px_25px_rgba(37,99,235,0.4)] transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={loading}
            className="w-full py-3 bg-zinc-900/80 hover:bg-zinc-800 border border-white/15 text-zinc-200 hover:text-white rounded-xl font-bold text-xs transition-all backdrop-blur-md flex items-center justify-center gap-2"
          >
            <Zap size={14} className="text-amber-400" /> Quick Demo (1-Click Login)
          </button>

          <div className="text-center text-xs text-zinc-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white text-xs">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
