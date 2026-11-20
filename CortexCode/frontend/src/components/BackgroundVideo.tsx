'use client';

interface BackgroundVideoProps {
  variant?: 'home' | 'auth' | 'subtle';
}

export default function BackgroundVideo({ variant = 'home' }: BackgroundVideoProps) {
  const isHome = variant === 'home';
  const isSubtle = variant === 'subtle';
  return (
    <div suppressHydrationWarning className="contents">
      {/* Video — subtle in light mode, rich in dark mode */}
      <video
        autoPlay
        loop
        muted
        playsInline
        suppressHydrationWarning
        className={`fixed inset-0 w-full h-full object-cover z-[-2] transition-all duration-700 opacity-15 dark:opacity-100 ${
          isHome
            ? 'dark:brightness-[1.05] contrast-[1.05] scale-100'
            : isSubtle
            ? 'dark:brightness-[0.45] contrast-[1.08] scale-100'
            : 'dark:brightness-[0.65] contrast-[1.08] scale-100'
        }`}
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>

      {/* Theme-aware overlay */}
      {isHome ? (
        <div
          suppressHydrationWarning
          className="fixed inset-0 w-full h-full z-[-1] pointer-events-none bg-gradient-to-b from-[var(--bg-main)]/85 via-[var(--bg-main)]/75 to-[var(--bg-main)]/90 dark:from-[#0B1120]/75 dark:via-[#0B1120]/45 dark:to-[#0B1120]/85"
        />
      ) : isSubtle ? (
        <div suppressHydrationWarning className="fixed inset-0 w-full h-full z-[-1] bg-[var(--bg-main)]/90 dark:bg-[#0B1120]/65 pointer-events-none" />
      ) : (
        <div
          suppressHydrationWarning
          className="fixed inset-0 w-full h-full z-[-1] pointer-events-none bg-[var(--bg-main)]/85 dark:bg-[#0B1120]/70"
        />
      )}
    </div>
  );
}
