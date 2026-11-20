'use client';

import { useState, useEffect } from 'react';

interface BackgroundVideoProps {
  variant?: 'home' | 'auth' | 'subtle';
}

export default function BackgroundVideo({ variant = 'home' }: BackgroundVideoProps) {
  const isHome = variant === 'home';
  const isSubtle = variant === 'subtle';
  return (
    <div suppressHydrationWarning className="contents">
      {/* Video — full brightness on home, darkened on auth */}
      <video
        autoPlay
        loop
        muted
        playsInline
        suppressHydrationWarning
        className={`fixed inset-0 w-full h-full object-cover z-[-2] transition-all duration-700 ${
          isHome
            ? 'brightness-[1.15] contrast-[1.08] saturate-[1.1] scale-100'
            : isSubtle
            ? 'brightness-[0.5] contrast-[1.1] scale-100'
            : 'brightness-[0.75] contrast-[1.1] scale-100'
        }`}
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>

      {/* Overlay — minimal on home for full video visibility */}
      {isHome ? (
        /* Very light vignette only at top and bottom — video stays vivid */
        <div
          suppressHydrationWarning
          className="fixed inset-0 w-full h-full z-[-1] pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 65%, rgba(0,0,0,0.55) 100%)'
          }}
        />
      ) : isSubtle ? (
        <div suppressHydrationWarning className="fixed inset-0 w-full h-full z-[-1] bg-zinc-950/40 pointer-events-none" />
      ) : (
        /* Auth pages — moderate overlay so glass cards read well */
        <div
          suppressHydrationWarning
          className="fixed inset-0 w-full h-full z-[-1] pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)'
          }}
        />
      )}
    </div>
  );
}
