'use client';

import { SunMoon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { toggleTheme } = useTheme();
  const label = 'Alternar entre luz clara e noturna';

  return <button
    type='button'
    onClick={toggleTheme}
    aria-label={label}
    title={label}
    className='theme-toggle'
  >
    <SunMoon size={19} strokeWidth={1.9} aria-hidden='true' />
    <span className='sr-only'>{label}</span>
  </button>;
}
