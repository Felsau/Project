import { useCallback, useEffect, useState } from 'react';

// Colour theme (light/dark) — persisted to localStorage and applied to the
// <html> element. Defaults to light; deep-links never depend on theme so this
// is purely a UI preference. Returns the current theme + a toggle.
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    // Default to light; users can switch to dark via the toggle (persisted).
    return 'light';
  });

  // Apply + persist the colour theme on the root element.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('theme', theme); } catch { /* storage blocked — ignore */ }
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme(t => (t === 'dark' ? 'light' : 'dark')), []);

  return { theme, toggleTheme };
}
