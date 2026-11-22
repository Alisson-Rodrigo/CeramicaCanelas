import React from 'react';
import { 
  LayoutDashboard, Users, ShieldCheck, Settings, FileText, 
  LogOut, X, Server, Bell
} from 'lucide-react';

interface SidebarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBackToMain: () => void;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
}

export function AdminSidebar({ currentScreen, onNavigate, onBackToMain, onCloseMobile, isCollapsed = false }: SidebarProps) {
  
  const getButtonClass = (screenName: string) => {
    const isActive = currentScreen === screenName;
    return `w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
      isActive 
        ? 'bg-gray-100 text-gray-800 border-r-4 border-gray-700' 
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
    }`;
  };

  return (
    <div className={`flex w-64 flex-col h-full border-r border-gray-200 bg-white transition-all duration-300 ${isCollapsed ? 'md:w-20 md:[&_span]:hidden md:[&_nav_p]:hidden md:[&_nav_button]:justify-center md:[&_nav_button]:px-2' : 'md:w-64'}`}>

      {/* Cabeçalho */}
      <div className={`border-b border-gray-100 flex items-center p-6 justify-between ${isCollapsed ? 'md:p-4 md:justify-center' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
            S
          </div>
          <span className="text-lg font-bold text-gray-800">Sistema</span>
        </div>
        {/* Botão X apenas no Mobile */}
        <button onClick={onCloseMobile} className="md:hidden text-gray-400 hover:text-red-500">
          <X size={20} />
        </button>
      </div>

      {/* Navegação Scrollável */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

        {/* PAINEL */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Painel</p>
          <button onClick={() => onNavigate('overview')} className={getButtonClass('overview')}>
            <LayoutDashboard size={18} /> <span>Visão Geral</span>
          </button>
        </div>

        {/* CONTROLE DE ACESSO */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Controle de Acesso</p>
          <button onClick={() => onNavigate('users')} className={getButtonClass('users')}>
            <Users size={18} /> <span>Usuários</span>
          </button>
          <button onClick={() => onNavigate('roles')} className={getButtonClass('roles')}>
            <ShieldCheck size={18} /> <span>Cargos e Permissões</span>
          </button>
        </div>

        {/* SISTEMA */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Sistema</p>
          <button onClick={() => onNavigate('settings')} className={getButtonClass('settings')}>
            <Settings size={18} /> <span>Configurações</span>
          </button>
          <button onClick={() => onNavigate('logs')} className={getButtonClass('logs')}>
            <FileText size={18} /> <span>Logs de Auditoria</span>
          </button>
          <button onClick={() => onNavigate('notifications')} className={getButtonClass('notifications')}>
            <Bell size={18} /> <span>Notificações</span>
          </button>
          <button onClick={() => onNavigate('database')} className={getButtonClass('database')}>
            <Server size={18} /> <span>Backup & Banco</span>
          </button>
        </div>

      </nav>

      {/* Rodapé */}
      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={onBackToMain}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm text-gray-600 bg-gray-50 hover:bg-red-50 hover:text-red-600 hover:shadow-sm transition-all ${isCollapsed ? 'md:px-2' : ''}`}
        >
          <LogOut size={18} className="rotate-180" />
          <span>Sair do Módulo</span>
        </button>
      </div>
    </div>
  );
}
