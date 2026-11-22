import React from 'react';
import { 
  Home, BarChart2, Clock, AlertTriangle, Repeat, UserMinus, 
  Package, Users, Tags, Truck, ArrowDownCircle, ArrowUpCircle, 
  Undo2, LogOut, X 
} from 'lucide-react';

interface SidebarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBackToMain: () => void;
  onCloseMobile: () => void; // Nova prop para fechar no mobile
  isCollapsed?: boolean;
}

export function InventorySidebar({ currentScreen, onNavigate, onBackToMain, onCloseMobile, isCollapsed = false }: SidebarProps) {
  
  const getButtonClass = (screenName: string) => {
    const isActive = currentScreen === screenName;
    return `w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
      isActive 
        ? 'bg-orange-50 text-orange-600 border-r-4 border-orange-500' 
        : 'text-gray-600 hover:bg-gray-50 hover:text-orange-500'
    }`;
  };

  return (
    <div className={`flex w-64 flex-col h-full border-r border-gray-200 bg-white transition-all duration-300 ${isCollapsed ? 'md:w-20 md:[&_span]:hidden md:[&_nav_p]:hidden md:[&_nav_button]:justify-center md:[&_nav_button]:px-2' : 'md:w-64'}`}>
      
      {/* Cabeçalho */}
      <div className={`border-b border-gray-100 flex items-center p-6 justify-between ${isCollapsed ? 'md:p-4 md:justify-center' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
            A
          </div>
          <span className="text-lg font-bold text-gray-800">Almoxarifado</span>
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
          <button onClick={() => onNavigate('expenses')} className={getButtonClass('expenses')}>
            <BarChart2 size={18} /> <span>Gastos por Categoria</span>
          </button>
          <button onClick={() => onNavigate('not-returned')} className={getButtonClass('not-returned')}>
            <Clock size={18} /> <span>Itens Não Devolvidos</span>
          </button>
          <button onClick={() => onNavigate('missing')} className={getButtonClass('missing')}>
            <AlertTriangle size={18} /> <span>Produtos em Falta</span>
          </button>
          <button onClick={() => onNavigate('recurring')} className={getButtonClass('recurring')}>
            <Repeat size={18} /> <span>Saídas Recorrentes</span>
          </button>
          <button onClick={() => onNavigate('withdrawals')} className={getButtonClass('withdrawals')}>
            <UserMinus size={18} /> <span>Retiradas por Func.</span>
          </button>
        </div>

        {/* CADASTROS */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Cadastros</p>
          <button onClick={() => onNavigate('products')} className={getButtonClass('products')}>
            <Package size={18} /> <span>Produtos</span>
          </button>
          <button onClick={() => onNavigate('employees')} className={getButtonClass('employees')}>
            <Users size={18} /> <span>Funcionários</span>
          </button>
          <button onClick={() => onNavigate('categories')} className={getButtonClass('categories')}>
            <Tags size={18} /> <span>Categorias</span>
          </button>
          <button onClick={() => onNavigate('suppliers')} className={getButtonClass('suppliers')}>
            <Truck size={18} /> <span>Fornecedores</span>
          </button>
        </div>

        {/* MOVIMENTAÇÃO */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Movimentação</p>
          <button onClick={() => onNavigate('stock-in')} className={getButtonClass('stock-in')}>
            <ArrowDownCircle size={18} /> <span>Entrada de Produtos</span>
          </button>
          <button onClick={() => onNavigate('stock-out')} className={getButtonClass('stock-out')}>
            <ArrowUpCircle size={18} /> <span>Saída de Produtos</span>
          </button>
          <button onClick={() => onNavigate('returns')} className={getButtonClass('returns')}>
            <Undo2 size={18} /> <span>Devolução</span>
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
