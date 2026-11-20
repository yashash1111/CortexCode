'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  GitBranch,
  Activity,
  Menu,
  X,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

const NAV_ITEMS = [
  { href: '/docs', label: 'Docs', icon: BookOpen, description: 'Document Knowledge Base' },
  { href: '/github', label: 'GitHub', icon: GitBranch, description: 'Repositories & PRs' },
  { href: '/observability', label: 'Observability', icon: Activity, description: 'Health, Jobs & Usage' },
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
      <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-800/80">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo.jpg"
            alt="CortexCode"
            className="w-7 h-7 rounded-lg border border-zinc-700 object-cover"
          />
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            CortexCode
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/80">
            v1
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
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
                  ? 'bg-zinc-800/90 text-zinc-50 font-medium border border-zinc-700/60 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-zinc-100' : 'text-zinc-500'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-zinc-800/80">
          <Link
            href="/workspace"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-zinc-500" />
              Legacy Workspaces
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
          </Link>
        </div>
      </nav>

      <div className="p-3 border-t border-zinc-800/80">
        {user ? (
          <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
            <div className="min-w-0">
              <div className="text-xs font-medium text-zinc-200 truncate">{user.name}</div>
              <div className="text-[11px] text-zinc-500 truncate">{user.email}</div>
            </div>
            <Link
              href="/logout"
              className="text-[11px] text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
            >
              Sign out
            </Link>
          </div>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center px-3 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <aside className="hidden lg:block w-60 shrink-0 border-r border-zinc-800/80 bg-zinc-950/95">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-64 bg-zinc-950 border-r border-zinc-800 h-full">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 px-4 sm:px-6 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-zinc-100 truncate">{title}</h1>
              {subtitle && <p className="text-xs text-zinc-500 truncate">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
