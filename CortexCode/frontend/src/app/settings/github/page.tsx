'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function GitHubCallbackPage({ searchParams }: { searchParams: Promise<{ success?: string, error?: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(searchParams);
  const isSuccess = unwrappedParams.success === 'true';
  const errorMsg = unwrappedParams.error;
  
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (isSuccess) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/workspace');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isSuccess, router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="z-10 p-8 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl text-center max-w-md w-full shadow-2xl">
        {isSuccess ? (
          <>
            <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">GitHub Connected!</h1>
            <p className="text-zinc-400 mb-6">Your account has been successfully linked to CortexCode.</p>
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              Redirecting to workspace in {countdown}...
            </div>
          </>
        ) : (
          <>
            <XCircle size={64} className="text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Connection Failed</h1>
            <p className="text-zinc-400 mb-6">{errorMsg || 'Failed to connect your GitHub account.'}</p>
            <Link href="/workspace" className="inline-block px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all">
              Return to Workspace
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
