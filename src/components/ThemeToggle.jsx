import { useState } from 'react';
import { getTheme, toggleTheme } from '../lib/theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getTheme());
  return (
    <button className="theme-toggle" title="Switch theme"
      onClick={() => setTheme(toggleTheme())}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
