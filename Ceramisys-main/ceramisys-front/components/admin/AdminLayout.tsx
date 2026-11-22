'use client';

import React, { useEffect, useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Menu } from 'lucide-react';

// --- IMPORTAÇÃO DAS VIEWS ---
import { RegisterUser } from './views/RegisterUser';
import { AdminDashboard } from './views/AdminDashboard'; 

// --- PLACEHOLDERS (Para as telas que ainda faltam) ---
const RoleList = () => <div className="p-4"><h1>Permissões e Cargos</h1></div>;
const SystemSettings = () => <div className="p-4"><h1>Configurações do Sistema</h1></div>;
const AuditLogs = () => <div className="p-4"><h1>Logs de Auditoria</h1></div>;

interface AdminLayoutProps {
  onBackToMain: () => void;
}

export function AdminLayout({ onBackToMain }: AdminLayoutProps) {
  const [activeScreen, setActiveScreen] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedScreen = localStorage.getItem('adminActiveScreen');
      if (savedScreen) setActiveScreen(savedScreen);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // ========================================================
  // FUNÇÃO PARA MUDAR DE TELA E SALVAR NO localStorage
  // ========================================================
  const handleNavigate = (screen: string) => {
    setActiveScreen(screen);
    localStorage.setItem('adminActiveScreen', screen);
    if (window.innerWidth < 768) setIsMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeScreen) {
      // Visão Geral (Agora usa o componente real)
      case 'overview': return <AdminDashboard />;
      
      // Usuários
      case 'users': return <RegisterUser />; 
      
      // Outros (Placeholders)
      case 'roles': return <RoleList />;
      case 'settings': return <SystemSettings />;
      case 'logs': return <AuditLogs />;

      default: return <AdminDashboard />;
    }
  };

  return (
    <div className="flex h-dvh min-h-0 bg-slate-50 overflow-hidden font-sans">
      
      {/* SIDEBAR RESPONSIVA */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-all duration-300 ease-in-out
        md:relative md:shadow-none
        w-64 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        ${isDesktopSidebarOpen ? 'md:w-64' : 'md:w-20'}
      `}>
        <div className={`${isDesktopSidebarOpen ? 'md:w-64' : 'md:w-20'} w-64 h-full transition-all duration-300`}>
          <AdminSidebar
            currentScreen={activeScreen}
            onNavigate={handleNavigate}
            onBackToMain={onBackToMain}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            isCollapsed={!isDesktopSidebarOpen}
          />
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header com controle da sidebar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 shrink-0">
          <button 
            onClick={() => window.innerWidth < 768 ? setIsMobileMenuOpen((open) => !open) : setIsDesktopSidebarOpen((open) => !open)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            aria-label="Alternar menu"
          >
            <Menu size={24} />
          </button>
          <span className="ml-4 font-bold text-gray-800">Administração</span>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 md:p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
