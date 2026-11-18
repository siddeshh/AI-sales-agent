import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'nova-theme';

function readSaved(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light'; // storage blocked (private window): fall back to the default
  }
}

/** Light by default; toggles the template's `.dark` class on <html> and remembers the choice per browser. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readSaved);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* not persisted; still applied for this session */
    }
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}
