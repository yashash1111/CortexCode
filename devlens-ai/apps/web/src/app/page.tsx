'use client';

import { useState } from 'react';
import BackgroundVideo from "../components/BackgroundVideo";
import Link from "next/link";
import { Sparkles, Shield, Cpu, ArrowRight, X, Play, Terminal, CheckCircle2, Zap, MessageSquare } from "lucide-react";
import DemoChat from '../components/chat/DemoChat';

export default function Home() {
  const [activeFeatureModal, setActiveFeatureModal] = useState<'rag' | 'bugs' | 'pr' | null>(null);
  const [showDemoChat, setShowDemoChat] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-between relative overflow-hidden text-white font-sans selection:bg-white/30 selection:text-white px-6 py-8">
      <BackgroundVideo variant="home" />

      {/* Dark gradient overlay to unify the video with UI */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70 pointer-events-none" />

      {/* Top Floating Navbar */}
      <header className="w-full max-w-6xl flex items-center justify-between z-20 animate-fade-in-up">
        <div className="flex items-center gap-3 group cursor-pointer">
          <img
            src="/logo.jpg"
            alt="CortexCode Logo"
            className="w-11 h-11 rounded-xl border border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-300 object-cover"
          />
          <span className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            CortexCode
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-white/80 hover:text-white transition-colors px-5 py-2.5 rounded-full hover:bg-white/10 backdrop-blur-sm"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-6 py-2.5 bg-white/15 hover:bg-white/25 border border-white/30 hover:border-white/50 text-white rounded-full text-sm font-bold transition-all duration-300 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="z-10 flex flex-col items-center text-center max-w-4xl w-full my-auto py-8">

        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-black/40 border border-white/20 text-xs md:text-sm font-semibold text-white/85 mb-8 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.4)] animate-float cursor-default">
          <Sparkles size={15} className="text-white/70" />
          <span>Next-Gen AI Developer Workspace</span>
        </div>

        {/* Hero Headline — clean white, no clashing gradients */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] mb-8 drop-shadow-[0_8px_30px_rgba(0,0,0,0.95)] animate-fade-in-up delay-100">
          <span className="text-white">The Ultimate</span>
          <br />
          <span className="text-white/95">AI Developer</span>
          <br />
          <span className="text-white/90">Workspace</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-white/75 max-w-2xl font-medium leading-relaxed mb-10 drop-shadow-[0_4px_20px_rgba(0,0,0,1)] animate-fade-in-up delay-200">
          Context-aware AI for your codebase. Ask complex questions, detect critical security bugs, and review pull requests instantly.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-12 animate-fade-in-up delay-300">
          <Link
            href="/login"
            className="group flex items-center justify-center gap-3 px-9 py-4 bg-black/80 hover:bg-black/95 text-white border border-white/20 hover:border-white/40 rounded-full font-black text-base transition-all duration-300 transform hover:scale-105 shadow-[0_8px_30px_rgba(0,0,0,0.7)] backdrop-blur-md"
          >
            <span>Sign In Now</span>
            <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform duration-300" />
          </Link>

          {/* Try Free Demo — opens live chat */}
          <button
            id="try-free-demo-btn"
            onClick={() => setShowDemoChat(true)}
            className="group flex items-center justify-center gap-2.5 px-8 py-4 bg-black/40 hover:bg-black/60 border border-white/25 hover:border-white/50 rounded-full font-bold text-base text-white transition-all duration-300 backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.5)] transform hover:scale-105"
          >
            <MessageSquare size={16} className="text-white/80 group-hover:scale-110 transition-transform" />
            <span>Try Free Demo</span>
          </button>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center items-center gap-3 max-w-3xl w-full animate-fade-in-up delay-400">
          <button
            onClick={() => setActiveFeatureModal('rag')}
            className="group flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/15 hover:border-white/35 backdrop-blur-md shadow-lg transition-all duration-300 transform hover:scale-105 text-left"
          >
            <div className="p-2.5 rounded-xl bg-white/10 text-white/70 group-hover:text-white group-hover:bg-white/15 transition-all">
              <Cpu size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white drop-shadow flex items-center gap-1.5">
                Context RAG <Zap size={11} className="text-white/60" />
              </div>
              <div className="text-[11px] text-white/50">Click to preview</div>
            </div>
          </button>

          <button
            onClick={() => setActiveFeatureModal('bugs')}
            className="group flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/15 hover:border-white/35 backdrop-blur-md shadow-lg transition-all duration-300 transform hover:scale-105 text-left"
          >
            <div className="p-2.5 rounded-xl bg-white/10 text-white/70 group-hover:text-white group-hover:bg-white/15 transition-all">
              <Shield size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white drop-shadow flex items-center gap-1.5">
                Bug Audit <Zap size={11} className="text-white/60" />
              </div>
              <div className="text-[11px] text-white/50">Click to preview</div>
            </div>
          </button>

          <button
            onClick={() => setActiveFeatureModal('pr')}
            className="group flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/15 hover:border-white/35 backdrop-blur-md shadow-lg transition-all duration-300 transform hover:scale-105 text-left"
          >
            <div className="p-2.5 rounded-xl bg-white/10 text-white/70 group-hover:text-white group-hover:bg-white/15 transition-all">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white drop-shadow flex items-center gap-1.5">
                PR Review <Zap size={11} className="text-white/60" />
              </div>
              <div className="text-[11px] text-white/50">Click to preview</div>
            </div>
          </button>
        </div>
      </main>

      {/* Feature Demo Modal */}
      {activeFeatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-fade-in-up">
          <div className="w-full max-w-2xl bg-zinc-950/95 border border-white/15 rounded-3xl p-6 md:p-8 shadow-[0_0_60px_rgba(0,0,0,0.8)] relative flex flex-col">
            <button
              onClick={() => setActiveFeatureModal(null)}
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            {activeFeatureModal === 'rag' && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 rounded-xl bg-white/10 text-white">
                    <Cpu size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Context-Aware RAG Engine</h3>
                    <p className="text-xs text-zinc-400">Deep semantic vector search across your code embeddings</p>
                  </div>
                </div>

                <div className="bg-black/60 border border-white/10 rounded-2xl p-4 font-mono text-xs text-zinc-300 space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                    <Terminal size={13} /> User: "How does JWT token verification work?"
                  </div>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-zinc-200 font-sans leading-relaxed">
                    <strong className="text-white block mb-1">CortexCode AI:</strong>
                    Authentication is implemented in <code className="text-zinc-300 font-mono bg-white/10 px-1 rounded">src/middleware/auth.middleware.ts</code>.
                    Tokens are verified using JWT with bearer header validation against <code className="text-zinc-300 font-mono bg-white/10 px-1 rounded">process.env.JWT_SECRET</code>.
                  </div>
                </div>

                <button
                  onClick={() => { setActiveFeatureModal(null); setShowDemoChat(true); }}
                  className="w-full py-3 bg-white text-zinc-900 text-center font-bold rounded-xl block hover:bg-white/90 transition"
                >
                  Launch Interactive RAG Chat →
                </button>
              </div>
            )}

            {activeFeatureModal === 'bugs' && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 rounded-xl bg-white/10 text-white">
                    <Shield size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Automated Security & Bug Audit</h3>
                    <p className="text-xs text-zinc-400">Static code evaluation for vulnerabilities & memory leaks</p>
                  </div>
                </div>

                <div className="bg-black/60 border border-white/10 rounded-2xl p-4 font-mono text-xs space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                    <Shield size={13} /> Audit Finding: SQL Injection Vulnerability detected
                  </div>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-zinc-200 font-sans leading-relaxed">
                    <div className="font-bold text-white mb-1">⚠️ Issue in src/controllers/user.ts (Line 42)</div>
                    Raw SQL parameter concatenation allows unescaped query injection.
                    <div className="mt-2 text-zinc-300 font-mono text-xs bg-black/40 p-2 rounded">
                      + Fix: Use parameterized query `prisma.$queryRaw`
                    </div>
                  </div>
                </div>

                <Link
                  href="/workspace/demo-repo-1/code"
                  className="w-full py-3 bg-white text-zinc-900 text-center font-bold rounded-xl block hover:bg-white/90 transition"
                >
                  Open Code Explorer & Bug Auditor →
                </Link>
              </div>
            )}

            {activeFeatureModal === 'pr' && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 rounded-xl bg-white/10 text-white">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">AI Pull Request Reviewer</h3>
                    <p className="text-xs text-zinc-400">Instant PR diff reviews with automated score & comments</p>
                  </div>
                </div>

                <div className="bg-black/60 border border-white/10 rounded-2xl p-4 font-mono text-xs space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                    <CheckCircle2 size={13} /> PR Review Score: 98/100 (Passed)
                  </div>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-zinc-200 font-sans leading-relaxed">
                    <div className="font-bold text-white mb-1">✓ Excellent Refactoring</div>
                    The diff introduces non-blocking thread scheduling and updates type definitions across workspace packages cleanly.
                  </div>
                </div>

                <Link
                  href="/register"
                  className="w-full py-3 bg-white text-zinc-900 text-center font-bold rounded-xl block hover:bg-white/90 transition"
                >
                  Connect GitHub & Automate PRs →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Free Demo Chat Modal */}
      {showDemoChat && (
        <DemoChat onClose={() => setShowDemoChat(false)} />
      )}

      {/* Footer */}
      <footer className="z-10 text-white/50 text-xs font-medium tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
        © {new Date().getFullYear()} CortexCode. All rights reserved.
      </footer>
    </div>
  );
}
