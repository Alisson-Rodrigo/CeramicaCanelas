'use client';

import React, { useEffect, useState } from 'react';
import { SalesSidebar } from './SalesSidebar';
import { Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

// Importação das Views
import { SalesHome } from './views/dashboards/SalesHome';
import { SalesHistory } from './views/dashboards/SalesHistory';
import { PendingSales } from './views/dashboards/PendingSales';
import { NewSale } from './views/controls/NewSale';

interface SalesLayoutProps {
  onBackToMain: () => void;
}

export function SalesLayout({ onBackToMain }: SalesLayoutProps) {
  const [activeScreen, setActiveScreen] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedScreen = localStorage.getItem('salesActiveScreen');
      if (savedScreen) setActiveScreen(savedScreen);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // ========================================================
  // FUNÇÃO PARA MUDAR DE TELA E SALVAR NO localStorage
  // ========================================================
  const handleNavigate = (screen: string) => {
    setActiveScreen(screen);
    localStorage.setItem('salesActiveScreen', screen);
    if (window.innerWidth < 768) setIsMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeScreen) {
      case 'home': return <SalesHome />;
      case 'new-sale': return <NewSale />;
      case 'pending': return <PendingSales />;
      case 'history': return <SalesHistory />;
      default: return <SalesHome />;
    }
  };

  return (
    <div className="flex h-dvh min-h-0 bg-slate-50 overflow-hidden font-sans text-slate-800">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-all duration-300 md:relative md:translate-x-0 md:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${isDesktopSidebarOpen ? 'md:w-64' : 'md:w-20'}`}>
        <div className={`${isDesktopSidebarOpen ? 'md:w-64' : 'md:w-20'} w-64 h-full transition-all duration-300`}>
          <SalesSidebar currentScreen={activeScreen} onNavigate={handleNavigate} onBackToMain={onBackToMain} onCloseMobile={() => setIsMobileMenuOpen(false)} isCollapsed={!isDesktopSidebarOpen} />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-4 shrink-0">
          <button onClick={() => window.innerWidth < 768 ? setIsMobileMenuOpen((open) => !open) : setIsDesktopSidebarOpen((open) => !open)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" aria-label="Alternar menu"><Menu size={24} /></button>
          <span className="ml-4 font-bold text-slate-800">Vendas</span>
          <div className="ml-auto"><ThemeToggle /></div>
        </header>
        <main className="app-content-enter flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 md:p-6 lg:p-8">{renderContent()}</main>
      </div>
    </div>
  );
}
