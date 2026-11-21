'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type AccentColor = 'purple' | 'blue' | 'emerald' | 'rose' | 'amber';
export type DensityMode = 'comfortable' | 'compact';
export type InterfaceDensity = DensityMode;

export interface AppearancePreferences {
  theme?: ThemeMode;
  accentColor?: AccentColor;
  density?: DensityMode;
  reducedMotion?: boolean;
}

const PUBLIC_DARK_ONLY_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/logout',
  '/auth/callback',
]);

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  accentColor: AccentColor;
  density: DensityMode;
  reducedMotion: boolean;
  setTheme: (mode: ThemeMode) => void;
  setAccentColor: (accent: AccentColor) => void;
  setDensity: (density: DensityMode) => void;
  setReducedMotion: (reduced: boolean) => void;
  applyPreferences: (prefs: AppearancePreferences) => void;
}

const STORAGE_KEY = 'cortexcode_theme';
const ACCENT_KEY = 'cortexcode_accent';
const DENSITY_KEY = 'cortexcode_density';
const MOTION_KEY = 'cortexcode_reduced_motion';

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'dark',
  accentColor: 'purple',
  density: 'comfortable',
  reducedMotion: false,
  setTheme: () => {},
  setAccentColor: () => {},
  setDensity: () => {},
  setReducedMotion: () => {},
  applyPreferences: () => {},
});

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeAttribute(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

function applyAppearanceAttributes(accent: AccentColor, density: DensityMode, reducedMotion: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-accent', accent);
  root.setAttribute('data-density', density);
  root.setAttribute('data-reduced-motion', reducedMotion ? 'true' : 'false');
}

function isValidAccent(val: unknown): val is AccentColor {
  return val === 'purple' || val === 'blue' || val === 'emerald' || val === 'rose' || val === 'amber';
}

function isValidDensity(val: unknown): val is DensityMode {
  return val === 'comfortable' || val === 'compact';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicDarkOnly = PUBLIC_DARK_ONLY_ROUTES.has(pathname || '/');
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [accentColor, setAccentState] = useState<AccentColor>('purple');
  const [density, setDensityState] = useState<DensityMode>('comfortable');
  const [reducedMotion, setReducedMotionState] = useState<boolean>(false);

  useEffect(() => {
    const syncInitial = () => {
      let storedTheme: ThemeMode = 'system';
      let storedAccent: AccentColor = 'purple';
      let storedDensity: DensityMode = 'comfortable';
      let storedMotion = false;

      try {
        const rawTheme = localStorage.getItem(STORAGE_KEY);
        if (rawTheme === 'light' || rawTheme === 'dark' || rawTheme === 'system') {
          storedTheme = rawTheme;
        }
        const rawAccent = localStorage.getItem(ACCENT_KEY);
        if (isValidAccent(rawAccent)) storedAccent = rawAccent;
        const rawDensity = localStorage.getItem(DENSITY_KEY);
        if (isValidDensity(rawDensity)) storedDensity = rawDensity;
        const rawMotion = localStorage.getItem(MOTION_KEY);
        if (rawMotion === 'true') storedMotion = true;
      } catch {
        // ignore storage errors
      }

      const resolved = isPublicDarkOnly ? 'dark' : storedTheme === 'system' ? getSystemTheme() : storedTheme;
      setThemeState(storedTheme);
      setResolvedTheme(resolved);
      setAccentState(storedAccent);
      setDensityState(storedDensity);
      setReducedMotionState(storedMotion);
      applyThemeAttribute(resolved);
      applyAppearanceAttributes(storedAccent, storedDensity, storedMotion);
    };

    queueMicrotask(syncInitial);
  }, [isPublicDarkOnly]);

  useEffect(() => {
    if (typeof window === 'undefined' || isPublicDarkOnly) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (theme === 'system') {
        const nextResolved = media.matches ? 'dark' : 'light';
        setResolvedTheme(nextResolved);
        applyThemeAttribute(nextResolved);
      }
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme, isPublicDarkOnly]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore storage errors
    }
    const resolved = isPublicDarkOnly ? 'dark' : mode === 'system' ? getSystemTheme() : mode;
    setResolvedTheme(resolved);
    applyThemeAttribute(resolved);
  }, [isPublicDarkOnly]);

  const setAccentColor = useCallback((accent: AccentColor) => {
    setAccentState(accent);
    try {
      localStorage.setItem(ACCENT_KEY, accent);
    } catch {
      // ignore
    }
    applyAppearanceAttributes(accent, density, reducedMotion);
  }, [density, reducedMotion]);

  const setDensity = useCallback((nextDensity: DensityMode) => {
    setDensityState(nextDensity);
    try {
      localStorage.setItem(DENSITY_KEY, nextDensity);
    } catch {
      // ignore
    }
    applyAppearanceAttributes(accentColor, nextDensity, reducedMotion);
  }, [accentColor, reducedMotion]);

  const setReducedMotion = useCallback((reduced: boolean) => {
    setReducedMotionState(reduced);
    try {
      localStorage.setItem(MOTION_KEY, reduced ? 'true' : 'false');
    } catch {
      // ignore
    }
    applyAppearanceAttributes(accentColor, density, reduced);
  }, [accentColor, density]);

  const applyPreferences = useCallback((prefs: AppearancePreferences) => {
    const nextTheme = prefs.theme && (prefs.theme === 'light' || prefs.theme === 'dark' || prefs.theme === 'system')
      ? prefs.theme
      : theme;
    const nextAccent = isValidAccent(prefs.accentColor) ? prefs.accentColor : accentColor;
    const nextDensity = isValidDensity(prefs.density) ? prefs.density : density;
    const nextMotion = typeof prefs.reducedMotion === 'boolean' ? prefs.reducedMotion : reducedMotion;

    setThemeState(nextTheme);
    setAccentState(nextAccent);
    setDensityState(nextDensity);
    setReducedMotionState(nextMotion);

    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
      localStorage.setItem(ACCENT_KEY, nextAccent);
      localStorage.setItem(DENSITY_KEY, nextDensity);
      localStorage.setItem(MOTION_KEY, nextMotion ? 'true' : 'false');
    } catch {
      // ignore
    }

    const resolved = isPublicDarkOnly ? 'dark' : nextTheme === 'system' ? getSystemTheme() : nextTheme;
    setResolvedTheme(resolved);
    applyThemeAttribute(resolved);
    applyAppearanceAttributes(nextAccent, nextDensity, nextMotion);
  }, [theme, accentColor, density, reducedMotion, isPublicDarkOnly]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        accentColor,
        density,
        reducedMotion,
        setTheme,
        setAccentColor,
        setDensity,
        setReducedMotion,
        applyPreferences,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
