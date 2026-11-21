'use client';

import { useRouter } from 'next/navigation';
import DemoChat from '@/components/chat/DemoChat';

export default function DemoPage() {
  const router = useRouter();

  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950">
      <DemoChat onClose={() => router.push('/')} />
    </div>
  );
}
