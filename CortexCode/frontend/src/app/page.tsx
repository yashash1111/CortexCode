'use client';

import { useState } from 'react';
import BackgroundVideo from "../components/BackgroundVideo";
import Link from "next/link";
import { Sparkles, Shield, Cpu, ArrowRight, X, Terminal, CheckCircle2, Zap, MessageSquare } from "lucide-react";
import DemoChat from '@/features/chat/DemoChat';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

export default function Home() {
  const [activeFeatureModal, setActiveFeatureModal] = useState<'rag' | 'bugs' | 'pr' | null>(null);
  const [showDemoChat, setShowDemoChat] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-between relative overflow-hidden text-[var(--text-primary)] font-sans px-6 py-8">
      <BackgroundVideo variant="home" />

      {/* Top Floating Navbar */}
      <header className="w-full max-w-6xl flex flex-wrap items-center justify-between gap-2 sm:gap-3 z-20 animate-fade-in-up">
        <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer shrink-0">
          <img
            src="/logo.jpg"
            alt="CortexCode Logo"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border border-[var(--border-default)] shadow-[var(--shadow-sm)] group-hover:scale-105 transition-transform duration-300 object-cover"
          />
          <span className="text-lg sm:text-2xl font-black tracking-tight text-[var(--text-primary)] whitespace-nowrap">
            CortexCode
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <ThemeSwitcher />
          <Link
            href="/login"
            className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-[var(--bg-hover)] whitespace-nowrap"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-3.5 sm:px-5 py-1.5 sm:py-2 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] rounded-full text-xs sm:text-sm font-bold transition-all duration-200 shadow-[var(--shadow-sm)] whitespace-nowrap"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="z-10 flex flex-col items-center text-center max-w-4xl w-full my-auto py-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--bg-card)]/90 border border-[var(--border-default)] text-xs md:text-sm font-semibold text-[var(--text-secondary)] mb-8 backdrop-blur-md shadow-[var(--shadow-sm)] cursor-default">
          <Sparkles size={15} className="text-[var(--accent-primary)]" />
          <span>Next-Gen AI Developer Workspace</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] mb-8 text-[var(--text-primary)] animate-fade-in-up delay-100">
          <span>The Ultimate</span>
          <br />
          <span className="text-[var(--accent-primary)]">AI Developer</span>
          <br />
          <span>Workspace</span>
        </h1>

        <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl font-medium leading-relaxed mb-10 animate-fade-in-up delay-200">
          Context-aware AI for your codebase. Ask complex questions, detect critical security bugs, and review pull requests instantly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-12 animate-fade-in-up delay-300">
          <Link
            href="/login"
            className="group flex items-center justify-center gap-3 px-8 py-3.5 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] rounded-full font-bold text-base transition-all duration-200 shadow-[var(--shadow-md)]"
          >
            <span>Sign In Now</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
          </Link>

          <button
            id="try-free-demo-btn"
            onClick={() => setShowDemoChat(true)}
            className="group flex items-center justify-center gap-2.5 px-8 py-3.5 bg-[var(--bg-card)]/95 hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-full font-bold text-base text-[var(--text-primary)] transition-all duration-200 backdrop-blur-md shadow-[var(--shadow-sm)]"
          >
            <MessageSquare size={16} className="text-[var(--accent-primary)] group-hover:scale-110 transition-transform" />
            <span>Try Free Demo</span>
          </button>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center items-center gap-3 max-w-3xl w-full animate-fade-in-up delay-400">
          <button
            onClick={() => setActiveFeatureModal('rag')}
            className="group flex items-center gap-3 px-5 py-3 rounded-2xl bg-[var(--bg-card)]/90 hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--accent-border)] backdrop-blur-md shadow-[var(--shadow-sm)] transition-transform duration-150 text-left"
          >
            <div className="p-2.5 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-primary)]">
              <Cpu size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                Context RAG <Zap size={11} className="text-[var(--accent-primary)]" />
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">Click to preview</div>
            </div>
          </button>

          <button
            onClick={() => setActiveFeatureModal('bugs')}
            className="group flex items-center gap-3 px-5 py-3 rounded-2xl bg-[var(--bg-card)]/90 hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--accent-border)] backdrop-blur-md shadow-[var(--shadow-sm)] transition-transform duration-150 text-left"
          >
            <div className="p-2.5 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-primary)]">
              <Shield size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                Bug Audit <Zap size={11} className="text-[var(--accent-primary)]" />
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">Click to preview</div>
            </div>
          </button>

          <button
            onClick={() => setActiveFeatureModal('pr')}
            className="group flex items-center gap-3 px-5 py-3 rounded-2xl bg-[var(--bg-card)]/90 hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--accent-border)] backdrop-blur-md shadow-[var(--shadow-sm)] transition-transform duration-150 text-left"
          >
            <div className="p-2.5 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-primary)]">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                PR Review <Zap size={11} className="text-[var(--accent-primary)]" />
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">Click to preview</div>
            </div>
          </button>
        </div>
      </main>

      {/* Feature Demo Modal */}
      {activeFeatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-xl animate-fade-in-up">
          <div className="w-full max-w-2xl bg-[var(--modal-bg)] border border-[var(--modal-border)] rounded-3xl p-6 md:p-8 shadow-[var(--shadow-lg)] relative flex flex-col">
            <button
              onClick={() => setActiveFeatureModal(null)}
              aria-label="Close modal"
              className="absolute top-5 right-5 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            {activeFeatureModal === 'rag' && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-primary)]">
                    <Cpu size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Context-Aware RAG Engine</h3>
                    <p className="text-xs text-[var(--text-muted)]">Deep semantic vector search across your code embeddings</p>
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-4 font-mono text-xs text-[var(--text-secondary)] space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold">
                    <Terminal size={13} /> User: &quot;How does JWT token verification work?&quot;
                  </div>
                  <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] font-sans leading-relaxed">
                    <strong className="text-[var(--text-primary)] block mb-1">CortexCode AI:</strong>
                    Authentication is implemented in <code className="text-[var(--accent-primary)] font-mono bg-[var(--accent-soft)] px-1 rounded">src/middleware/auth.middleware.ts</code>.
                    Tokens are verified using JWT with bearer header validation against <code className="text-[var(--accent-primary)] font-mono bg-[var(--accent-soft)] px-1 rounded">process.env.JWT_SECRET</code>.
                  </div>
                </div>

                <button
                  onClick={() => { setActiveFeatureModal(null); setShowDemoChat(true); }}
                  className="w-full py-3 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] text-center font-bold rounded-xl block transition"
                >
                  Launch Interactive RAG Chat →
                </button>
              </div>
            )}

            {activeFeatureModal === 'bugs' && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-primary)]">
                    <Shield size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Automated Security & Bug Audit</h3>
                    <p className="text-xs text-[var(--text-muted)]">Static code evaluation for vulnerabilities & memory leaks</p>
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-4 font-mono text-xs space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-[var(--status-warning)] font-semibold">
                    <Shield size={13} /> Audit Finding: SQL Injection Vulnerability detected
                  </div>
                  <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] font-sans leading-relaxed">
                    <div className="font-bold text-[var(--text-primary)] mb-1">⚠️ Issue in src/controllers/user.ts (Line 42)</div>
                    Raw SQL parameter concatenation allows unescaped query injection.
                    <div className="mt-2 text-[var(--code-text)] font-mono text-xs bg-[var(--code-bg)] border border-[var(--code-border)] p-2 rounded">
                      + Fix: Use parameterized query `prisma.$queryRaw`
                    </div>
                  </div>
                </div>

                <Link
                  href="/workspace/demo-repo-1/code"
                  className="w-full py-3 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] text-center font-bold rounded-xl block transition"
                >
                  Open Code Explorer & Bug Auditor →
                </Link>
              </div>
            )}

            {activeFeatureModal === 'pr' && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-primary)]">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">AI Pull Request Reviewer</h3>
                    <p className="text-xs text-[var(--text-muted)]">Instant PR diff reviews with automated score & comments</p>
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-4 font-mono text-xs space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-[var(--status-success)] font-semibold">
                    <CheckCircle2 size={13} /> PR Review Score: 98/100 (Passed)
                  </div>
                  <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] font-sans leading-relaxed">
                    <div className="font-bold text-[var(--text-primary)] mb-1">✓ Excellent Refactoring</div>
                    The diff introduces non-blocking thread scheduling and updates type definitions across workspace packages cleanly.
                  </div>
                </div>

                <Link
                  href="/register"
                  className="w-full py-3 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] text-center font-bold rounded-xl block transition"
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
      <footer className="z-10 text-[var(--text-muted)] text-xs font-medium tracking-wider">
        © {new Date().getFullYear()} CortexCode. All rights reserved.
      </footer>
    </div>
  );
}
