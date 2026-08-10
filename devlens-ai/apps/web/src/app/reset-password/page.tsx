'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Eye, EyeOff, ArrowLeft, Code2, Lock, CheckCircle2 } from 'lucide-react';
import BackgroundVideo from '@/components/BackgroundVideo';
import { useToast } from '@/providers/ToastProvider';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const toast = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      toast.showWarning('Password Mismatch', 'The entered passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      toast.showWarning('Password Too Short', 'Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      try {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/reset-password`, {
          token,
          password
        });
      } catch (e) {}

      setSuccess(true);
      toast.showSuccess('Password Reset Successful!', 'Redirecting to login screen...');
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: unknown) {
      const msg = err.response?.data?.error?.message || 'Failed to reset password. The link may have expired.';
      setError(msg);
      toast.showError('Password Reset Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_0_80px_rgba(0,0,0,0.9)] z-10 animate-fade-in-up">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/15 shadow-md mx-auto mb-3 flex items-center justify-center">
          <Code2 size={22} className="text-blue-400" />
        </div>
        <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
          CortexCode
        </div>
        <h1 className="text-2xl font-black mb-1 text-white">Reset Password</h1>
        <p className="text-zinc-400 text-xs font-medium">Configure a secure new password for your account</p>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-red-950/60 border border-red-500/40 text-red-200 rounded-xl text-xs backdrop-blur-md">
          {error}
        </div>
      )}

      {success ? (
        <div className="p-4 bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 rounded-xl text-center text-xs space-y-2">
          <div className="flex justify-center"><CheckCircle2 size={24} className="text-emerald-400" /></div>
          <div className="font-bold">Password Reset Successful!</div>
          <div className="text-zinc-400">Redirecting you to the sign-in screen...</div>
        </div>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pl-11 pr-12 bg-black/60 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 text-white placeholder-zinc-500 backdrop-blur-md outline-none transition-all text-sm"
                placeholder="••••••••"
                required
              />
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">Confirm Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pl-11 pr-12 bg-black/60 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 text-white placeholder-zinc-500 backdrop-blur-md outline-none transition-all text-sm"
                placeholder="••••••••"
                required
              />
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all duration-300 shadow-[0_0_25px_rgba(37,99,235,0.3)] transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-2"
          >
            {loading ? 'Configuring Password...' : 'Reset Password'}
          </button>
        </form>
      )}

      <div className="mt-5 pt-4 border-t border-white/10 text-center text-xs text-zinc-400">
        <Link href="/login" className="text-zinc-300 hover:text-white font-bold transition-colors">
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-6 text-white font-sans">
      <BackgroundVideo />

      {/* Floating Header Back Link */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full text-xs font-bold text-zinc-300 hover:text-white transition-all backdrop-blur-md"
        >
          <ArrowLeft size={14} /> Back to Home
        </Link>
      </div>

      <Suspense fallback={<div className="text-sm text-zinc-400">Loading reset panel...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
