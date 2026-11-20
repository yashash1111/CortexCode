'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeft, KeyRound, CheckCircle2, RefreshCw, Send } from 'lucide-react';
import BackgroundVideo from '@/components/BackgroundVideo';
import { useToast } from '@/providers/ToastProvider';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/forgot-password`, {
        email
      });
      setSubmitted(true);
      toast.showSuccess('Reset Link Dispatched', `Password reset token sent to ${email}`);
    } catch (err: unknown) {
      setSubmitted(true);
      toast.showSuccess('Reset Link Dispatched', `Password reset token sent to ${email}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-6 text-white font-sans">
      <BackgroundVideo variant="auth" />

      {/* Floating Header Back Link */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/login"
          className="flex items-center gap-2 px-4 py-2 bg-black/50 hover:bg-black/80 border border-white/10 rounded-full text-xs font-bold text-zinc-300 hover:text-white transition-all backdrop-blur-md"
        >
          <ArrowLeft size={14} /> Back to Login
        </Link>
      </div>
      
      {/* Interactive Glass Card */}
      <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_0_80px_rgba(0,0,0,0.9)] z-10 animate-fade-in-up">
        
        {/* Security Vault Icon Header */}
        <div className="text-center mb-8">
          <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <div className="w-full h-full rounded-2xl bg-zinc-900 border border-white/15 shadow-[0_0_30px_rgba(255,255,255,0.05)] flex items-center justify-center">
              <KeyRound size={26} className="text-blue-400" />
            </div>
          </div>
          
          <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
            Account Security
          </div>
          <h1 className="text-2xl font-black mb-1 text-white">Password Recovery</h1>
          <p className="text-zinc-400 text-xs font-medium">Verify your email address to receive a secure reset link</p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-red-950/60 border border-red-500/40 text-red-200 rounded-xl text-xs backdrop-blur-md">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="text-center space-y-5 animate-fade-in-up">
            <div className="p-5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs backdrop-blur-md font-medium leading-relaxed shadow-lg">
              <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-400" />
              Password reset link dispatched to <strong className="text-white block mt-1">{email}</strong>
              <div className="text-[11px] text-zinc-400 mt-2">
                Check your Inbox & Spam folders. The reset link is active for 60 minutes.
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  toast.showInfo('Reset Form Cleared', 'Enter your email address to retry token generation.');
                }}
                className="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold transition-all text-white flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} /> Send Again / Change Email
              </button>
              
              <Link href="/login" className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-xs font-bold transition-all text-blue-300 text-center">
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">Registered Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-black/60 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 text-white placeholder-zinc-500 backdrop-blur-md outline-none transition-all text-sm"
                placeholder="you@example.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all duration-300 shadow-[0_0_25px_rgba(37,99,235,0.3)] transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Dispatched Token...' : 'Dispatch Reset Link'} <Send size={15} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
