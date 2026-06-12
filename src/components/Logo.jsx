import { useEffect, useState } from 'react';
import logoBlack from '../assets/logo.png';
import logoWhite from '../assets/logo-white.png';

// Swaps logo variant with the active theme
export default function Logo({ height = 56, ...rest }) {
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'light');
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setTheme(document.documentElement.getAttribute('data-theme') || 'light'));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return <img src={theme === 'dark' ? logoWhite : logoBlack} alt="The Bowling Circle" style={{ height, objectFit: 'contain' }} {...rest} />;
}
