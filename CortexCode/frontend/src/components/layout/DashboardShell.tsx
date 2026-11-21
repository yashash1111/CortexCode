'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  GitBranch,
  Menu,
  X,
  ArrowUpRight,
  Layers,
  Shield,
  User,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

const NAV_ITEMS = [
  { href: '/docs', label: 'Docs', icon: BookOpen, description: 'Document Knowledge Base' },
  { href: '/github', label: 'GitHub', icon: GitBranch, description: 'Repositories & PRs' },
];

export function DashboardShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="h-14 px-4 flex items-center justify-between border-b border-[var(--sidebar-border)]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-[1px] shadow-md shadow-violet-600/20">
            <img
              src="/logo.jpg"
              alt="CortexCode"
              className="w-full h-full rounded-[11px] object-cover"
            />
          </div>
          <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
            CortexCode
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-[var(--accent-border)]">
            Pro
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Workspace
        </div>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                active
                  ? 'bg-[var(--sidebar-item-active)] text-[var(--accent-primary)] font-medium border border-[var(--accent-border)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)] border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-[var(--sidebar-border)] space-y-1">
          <Link
            href="/profile"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              pathname.startsWith('/profile')
                ? 'bg-[var(--sidebar-item-active)] text-[var(--accent-primary)] border border-[var(--accent-border)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Profile
          </Link>
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin/ai-providers"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                pathname.startsWith('/admin/ai-providers')
                  ? 'bg-[var(--sidebar-item-active)] text-[var(--accent-primary)] border border-[var(--accent-border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              AI Providers (Admin)
            </Link>
          )}
          <Link
            href="/workspace"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              Legacy Workspaces
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </Link>
        </div>
      </nav>

      <div className="p-3 border-t border-[var(--sidebar-border)] space-y-2.5">
        {user ? (
          <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)]">
            <div className="min-w-0">
              <div className="text-xs font-medium text-[var(--text-primary)] truncate">{user.name}</div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</div>
            </div>
            <Link
              href="/logout"
              className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
            >
              Sign out
            </Link>
          </div>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center px-3 py-2 rounded-lg bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] text-xs font-semibold transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex">
      <aside className="hidden lg:block w-60 shrink-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[var(--bg-overlay)] backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-64 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] h-full shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col cortex-ambient-bg">
        <header className="h-14 px-4 sm:px-6 border-b border-[var(--border-default)] flex items-center justify-between gap-3 bg-[var(--header-bg)] backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</h1>
              {subtitle && <p className="text-xs text-[var(--text-muted)] truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {actions}
            <ThemeSwitcher />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
