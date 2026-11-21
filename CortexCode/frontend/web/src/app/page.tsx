import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex justify-between items-center p-6 border-b border-zinc-800">
        <div className="text-xl font-bold">DevLens AI</div>
        <div className="space-x-4">
          <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition">Login</Link>
          <Link href="/register" className="text-sm bg-white text-black px-4 py-2 rounded-md font-medium hover:bg-zinc-200 transition">Get Started</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto w-full">
        <h1 className="text-5xl font-bold tracking-tight mb-6">Understand Your Codebase.</h1>
        <p className="text-xl text-zinc-400 mb-10 max-w-2xl">
          Connect GitHub repositories, explore your code, and understand your projects from one workspace.
        </p>
        <div className="flex gap-4">
          <Link href="/login" className="bg-white text-black px-8 py-3 rounded-md font-medium hover:bg-zinc-200 transition">Connect GitHub</Link>
          <Link href="/register" className="bg-zinc-800 text-white border border-zinc-700 px-8 py-3 rounded-md font-medium hover:bg-zinc-700 transition">Get Started</Link>
        </div>
      </main>
      
      <footer className="p-6 text-center text-sm text-zinc-600 border-t border-zinc-800">
        &copy; {new Date().getFullYear()} DevLens AI. All rights reserved.
      </footer>
    </div>
  );
}
