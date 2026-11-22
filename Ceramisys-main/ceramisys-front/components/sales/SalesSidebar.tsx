import React from 'react';
import { 
  Home, ShoppingCart, Clock, FileBarChart, 
  LogOut, X 
} from 'lucide-react';

interface SidebarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBackToMain: () => void;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
}

export function SalesSidebar({ currentScreen, onNavigate, onBackToMain, onCloseMobile, isCollapsed = false }: SidebarProps) {
  
  const getButtonClass = (screenName: string) => {
    const isActive = currentScreen === screenName;
    return `w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
      isActive 
        ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-500' 
        : 'text-gray-600 hover:bg-gray-50 hover:text-blue-500'
    }`;
  };

  return (
    <div className={`flex w-64 flex-col h-full border-r border-gray-200 bg-white transition-all duration-300 ${isCollapsed ? 'md:w-20 md:[&_span]:hidden md:[&_nav_p]:hidden md:[&_nav_button]:justify-center md:[&_nav_button]:px-2' : 'md:w-64'}`}>

      {/* Cabeçalho */}
      <div className={`border-b border-gray-100 flex items-center p-6 justify-between ${isCollapsed ? 'md:p-4 md:justify-center' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
            V
          </div>
          <span className="text-lg font-bold text-gray-800">Vendas</span>
        </div>
        {/* Botão X apenas no Mobile */}
        <button onClick={onCloseMobile} className="md:hidden text-gray-400 hover:text-red-500">
          <X size={20} />
        </button>
      </div>

      {/* Navegação Scrollável */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

        {/* DASHBOARDS E LANÇAMENTOS */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Dashboards e Lançamentos</p>
          <button onClick={() => onNavigate('home')} className={getButtonClass('home')}>
            <Home size={18} /> <span>Início</span>
          </button>
          <button onClick={() => onNavigate('new-sale')} className={getButtonClass('new-sale')}>
            <ShoppingCart size={18} /> <span>Registrar Venda</span>
          </button>
        </div>

        {/* RELATÓRIOS */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Relatórios</p>
          <button onClick={() => onNavigate('pending')} className={getButtonClass('pending')}>
            <Clock size={18} /> <span>Vendas Pendentes</span>
          </button>
          <button onClick={() => onNavigate('history')} className={getButtonClass('history')}>
            <FileBarChart size={18} /> <span>Relatório de Vendas</span>
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
