'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { KilnControl } from './KilnControl';
import { KilnSidebar } from './KilnSidebar';

interface KilnLayoutProps {
  onBackToMain: () => void;
  onManageEmployees: () => void;
}

export function KilnLayout({ onBackToMain, onManageEmployees }: KilnLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(true);
  const mobileMenuTrigger = useRef<HTMLButtonElement>(null);
  const mobileMenuClose = useRef<HTMLButtonElement>(null);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    requestAnimationFrame(() => mobileMenuTrigger.current?.focus());
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const focusFrame = requestAnimationFrame(() => mobileMenuClose.current?.focus());
    const desktop = window.matchMedia('(min-width: 768px)');
    const handleViewport = () => {
      if (desktop.matches) setMobileMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) closeMobileMenu();
    };

    desktop.addEventListener('change', handleViewport);
    window.addEventListener('keydown', handleEscape);
    return () => {
      cancelAnimationFrame(focusFrame);
      desktop.removeEventListener('change', handleViewport);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [closeMobileMenu, mobileMenuOpen]);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-slate-50 font-sans text-slate-800">
      {mobileMenuOpen && (
        <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={closeMobileMenu} />
      )}

      <aside
        id="production-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-full shrink-0 flex-col border-r border-gray-200 bg-white transition-[transform,width] duration-200 motion-reduce:transition-none md:visible md:relative md:translate-x-0
          ${mobileMenuOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'} ${desktopMenuOpen ? 'md:w-64' : 'md:w-20'}`}
      >
        <KilnSidebar
          collapsed={!desktopMenuOpen}
          closeRef={mobileMenuClose}
          onCloseMobile={closeMobileMenu}
          onBackToMain={onBackToMain}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden" inert={mobileMenuOpen || undefined}>
        <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-4">
          <button
            ref={mobileMenuTrigger}
            type="button"
            aria-label="Alternar menu"
            aria-controls="production-navigation"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          >
            <Menu size={24} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Alternar menu"
            aria-controls="production-navigation"
            aria-expanded={desktopMenuOpen}
            onClick={() => setDesktopMenuOpen(open => !open)}
            className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:inline-flex"
          >
            <Menu size={24} aria-hidden="true" />
          </button>
          <span className="ml-4 font-bold text-slate-800">Produção</span>
          <div className="ml-auto flex items-center gap-2"><NotificationBell /><ThemeToggle /></div>
        </header>
        <main className="app-content-enter custom-scrollbar min-w-0 flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
          <KilnControl onManageEmployees={onManageEmployees} />
        </main>
      </div>
    </div>
  );
}
