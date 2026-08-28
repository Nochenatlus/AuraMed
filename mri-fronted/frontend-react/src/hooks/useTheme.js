import { useCallback, useEffect, useState } from 'react';

const THEME_KEY = 'auramed_theme';

/** Açık/koyu tema tercihi (kalıcı, ilk açılışta sistem tercihine düşer) + <html> köküne uygulanan sınıf. */
export function useTheme() {
  const [theme, setThemeState] = useState(() => localStorage.getItem(THEME_KEY) || 'system');
  const [resolvedTheme, setResolvedTheme] = useState('light');

  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode) => { root.classList.remove('light', 'dark'); root.classList.add(mode); setResolvedTheme(mode); };

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches ? 'dark' : 'light');
      const onChange = (e) => apply(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    apply(theme);
    return undefined;
  }, [theme]);

  const setTheme = useCallback((next) => {
    localStorage.setItem(THEME_KEY, next);
    setThemeState(next);
  }, []);

  return { theme, resolvedTheme, setTheme };
}
