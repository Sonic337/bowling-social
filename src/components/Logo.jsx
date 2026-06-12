import { useEffect, useState } from 'react';
import markBlack from '../assets/mark.png';
import markWhite from '../assets/mark-white.png';

function useTheme() {
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'light');
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setTheme(document.documentElement.getAttribute('data-theme') || 'light'));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

// Stacked: mark centered, wordmark as text below. For auth pages.
export function LogoStacked({ markHeight = 72 }) {
  const theme = useTheme();
  return (
    <div style={{ textAlign: 'center', marginBottom: 18 }}>
      <img src={theme === 'dark' ? markWhite : markBlack} alt=""
        style={{ height: markHeight, maxWidth: '100%', objectFit: 'contain', display: 'inline-block' }} />
      <div style={{ fontWeight: 900, fontSize: 19, letterSpacing: '-.01em', marginTop: 6 }}>
        The Bowling <span style={{ color: 'var(--accent)' }}>Circle</span>
      </div>
    </div>
  );
}

// Horizontal: mark + text side by side. For page headers.
export default function Logo({ height = 40 }) {
  const theme = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <img src={theme === 'dark' ? markWhite : markBlack} alt=""
        style={{ height, objectFit: 'contain', flexShrink: 0 }} />
      <span style={{ fontWeight: 900, fontSize: Math.round(height * 0.42), letterSpacing: '-.01em', whiteSpace: 'nowrap' }}>
        The Bowling <span style={{ color: 'var(--accent)' }}>Circle</span>
      </span>
    </div>
  );
}
