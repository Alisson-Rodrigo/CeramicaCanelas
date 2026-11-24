import React from 'react';
import { 
  Home, Tags, Users, Banknote, Clock, FileText,
  Layers, BarChart3, ArrowDownCircle, ArrowUpCircle, 
  PieChart, ScrollText, FileBarChart, LogOut, X 
} from 'lucide-react';

interface SidebarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBackToMain: () => void;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
}

export function FinanceSidebar({ currentScreen, onNavigate, onBackToMain, onCloseMobile, isCollapsed = false }: SidebarProps) {
  
  const getButtonClass = (screenName: string) => {
    const isActive = currentScreen === screenName;
    return `w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all duration-200 group ${
      isActive 
        ? 'bg-emerald-50 font-semibold text-emerald-700 [html[data-theme=dark]_&]:text-emerald-300'
        : 'font-medium text-gray-600 hover:bg-gray-50 hover:text-emerald-500'
    }`;
  };

  return (
    <div className={`flex w-64 flex-col h-full border-r border-gray-200 bg-white transition-all duration-300 ${isCollapsed ? 'md:w-20 md:[&_span]:hidden md:[&_nav_p]:hidden md:[&_nav_button]:justify-center md:[&_nav_button]:px-2' : 'md:w-64'}`}>

      {/* Cabeçalho */}
      <div className={`border-b border-gray-100 flex items-center p-6 justify-between ${isCollapsed ? 'md:p-4 md:justify-center' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
            F
          </div>
          <span className="text-lg font-bold text-gray-800">Financeiro</span>
        </div>
        {/* Botão X apenas no Mobile */}
        <button onClick={onCloseMobile} className="md:hidden text-gray-400 hover:text-red-500">
          <X size={20} />
        </button>
      </div>

      {/* Navegação Scrollável */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

        {/* VISÃO GERAL */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Visão Geral</p>
          <button onClick={() => onNavigate('home')} className={getButtonClass('home')}>
            <Home size={18} /> <span>Início</span>
          </button>
        </div>

        {/* CADASTROS E LANÇAMENTOS */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Cadastros e Lançamentos</p>
          <button onClick={() => onNavigate('categories')} className={getButtonClass('categories')}>
            <Tags size={18} /> <span>Categorias Financeiras</span>
          </button>
          <button onClick={() => onNavigate('customers')} className={getButtonClass('customers')}>
            <Users size={18} /> <span>Cadastro de Clientes</span>
          </button>
          <button onClick={() => onNavigate('transactions')} className={getButtonClass('transactions')}>
            <Banknote size={18} /> <span>Lançamentos</span>
          </button>
          <button onClick={() => onNavigate('pending')} className={getButtonClass('pending')}>
            <Clock size={18} /> <span>Pendentes</span>
          </button>
          <button onClick={() => onNavigate('register-statement')} className={getButtonClass('register-statement')}>
            <FileText size={18} /> <span>Cadastrar Extrato</span>
          </button>
          <button onClick={() => onNavigate('main-categories')} className={getButtonClass('main-categories')}>
            <Layers size={18} /> <span>Categorias Principais</span>
          </button>
        </div>

        {/* RELATÓRIOS E BALANCETES */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Relatórios e Balancetes</p>
          <button onClick={() => onNavigate('cash-flow')} className={getButtonClass('cash-flow')}>
            <BarChart3 size={18} /> <span>Movimento Caixa</span>
          </button>
          <button onClick={() => onNavigate('balance-out')} className={getButtonClass('balance-out')}>
            <ArrowDownCircle size={18} /> <span>Balancete de Saídas</span>
          </button>
          <button onClick={() => onNavigate('balance-in')} className={getButtonClass('balance-in')}>
            <ArrowUpCircle size={18} /> <span>Balancete de Entradas</span>
          </button>
          <button onClick={() => onNavigate('report-customers')} className={getButtonClass('report-customers')}>
            <PieChart size={18} /> <span>Relatório dos Clientes</span>
          </button>
          <button onClick={() => onNavigate('report-statements')} className={getButtonClass('report-statements')}>
            <ScrollText size={18} /> <span>Relatório de Extratos</span>
          </button>
          <button onClick={() => onNavigate('verification')} className={getButtonClass('verification')}>
            <FileBarChart size={18} /> <span>Balancete de Verificação</span>
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
