import { useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'JINNI_THEME';

/**
 * Reads the persisted theme or defaults to 'dark' (Night mode).
 */
export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {}
  return 'dark';
}

/**
 * Applies the given theme mode to document.documentElement.
 */
export function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  if (theme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

/**
 * Custom hook to consume and toggle theme between Day (Light) and Night (Dark) mode.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    return next;
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };
}
