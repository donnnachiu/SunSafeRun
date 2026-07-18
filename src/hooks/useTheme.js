import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sunsaferun-theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'theme-night';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'theme-day' || saved === 'theme-night') return saved;
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'theme-day' : 'theme-night';
}

/**
 * Manual light/dark theme toggle. Persists the user's choice in
 * localStorage so it survives a refresh; falls back to the OS-level
 * light/dark preference the very first time the app is opened.
 */
export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'theme-day' ? 'theme-night' : 'theme-day'));
  }, []);

  return { theme, isDaytime: theme === 'theme-day', toggleTheme };
}
