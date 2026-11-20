'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare, Code2, ArrowLeft, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

export default function RepositoryLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ repositoryId: string }>;
}) {
  const unwrappedParams = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const [repoName, setRepoName] = useState('Repository');
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexSuccess, setIndexSuccess] = useState(false);

  useEffect(() => {
    fetchRepoDetails();
  }, [unwrappedParams.repositoryId]);

  const fetchRepoDetails = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      // No token = demo mode, skip API call entirely
      if (!token || token === 'null' || token === 'undefined') return;
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/repositories/${unwrappedParams.repositoryId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setRepoName(res.data.data.name || 'Repository');
      }
    } catch {
      // Silently ignore — demo workspace doesn't require auth
    }
  };

  const handleIndexRepo = async () => {
    setIsIndexing(true);
    setIndexSuccess(false);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token || token === 'null' || token === 'undefined') {
        setIsIndexing(false);
        return;
      }
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/repositories/${unwrappedParams.repositoryId}/ai/index`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIndexSuccess(true);
      setTimeout(() => setIndexSuccess(false), 4000);
    } catch {
      // Silently ignore in demo mode
    } finally {
      setIsIndexing(false);
    }
  };

  const handleLogout = () => {
    router.push('/logout');
  };

  const isChat = pathname.includes('/chat');
  const isCode = pathname.includes('/code');

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Top Bar Navigation */}
      <header className="h-16 border-b border-white/10 bg-zinc-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <Link
            href="/workspace"
            className="flex items-center gap-2.5 group"
          >
            <img src="/logo.jpg" alt="CortexCode Logo" className="w-8 h-8 rounded-lg border border-white/20 shadow-md group-hover:scale-105 transition-transform object-cover" />
            <span className="font-black text-sm bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300">
              CortexCode
            </span>
          </Link>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="font-semibold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            {repoName}
          </div>

          <nav className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5 ml-4">
            <Link
              href={`/workspace/${unwrappedParams.repositoryId}/chat`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                isChat ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <MessageSquare size={16} /> AI Chat
            </Link>
            <Link
              href={`/workspace/${unwrappedParams.repositoryId}/code`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                isCode ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Code2 size={16} /> Code Explorer
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleIndexRepo}
            disabled={isIndexing}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded-lg font-medium border border-white/10 transition-all disabled:opacity-50"
          >
            {indexSuccess ? (
              <>
                <CheckCircle2 size={14} className="text-green-400" /> Indexing Queued
              </>
            ) : (
              <>
                <RefreshCw size={14} className={isIndexing ? 'animate-spin' : ''} /> Index Codebase
              </>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Main Page Body */}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
