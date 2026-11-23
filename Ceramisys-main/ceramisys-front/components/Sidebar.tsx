'use client';

import React, { useEffect, useState } from 'react';
// ADICIONEI O ÍCONE ShieldCheck
import { LayoutDashboard, Box, ShoppingCart, Wallet, X, LogOut, ArrowLeft, LucideIcon, ShieldCheck, HandCoins, Factory } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

interface CustomJwtPayload {
  role: string;
  unique_name: string;
  exp: number;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  allowedRoles?: string[];
}

interface SidebarProps {
  activeSection: string;
  onChangeSection: (section: string) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  customMenuItems?: MenuItem[]; 
  variant?: 'overview';
  onBack?: () => void;          
}

// --- ATUALIZEI AQUI: ADICIONEI O MENU 'ADMIN' ---
export const GLOBAL_MENU_ITEMS: MenuItem[] = [
  { id: 'overview', icon: LayoutDashboard, label: 'Visão Geral', allowedRoles: ['Admin', 'Viewer', 'Financial', 'Almoxarifado', 'Sales'] },
  { id: 'inventory', icon: Box, label: 'Almoxarifado', allowedRoles: ['Admin', 'Almoxarifado'] },
  { id: 'kilns', icon: Factory, label: 'Produção', allowedRoles: ['Admin', 'Almoxarifado'] },
  { id: 'sales', icon: ShoppingCart, label: 'Vendas', allowedRoles: ['Admin', 'Sales'] },
  { id: 'finance', icon: Wallet, label: 'Financeiro', allowedRoles: ['Admin', 'Financial'] },
  { id: 'payments', icon: HandCoins, label: 'Pagamentos', allowedRoles: ['Admin', 'Financial'] },
  // NOVO ITEM:
  { id: 'admin', icon: ShieldCheck, label: 'Administração', allowedRoles: ['Admin'] },
];

export function Sidebar({ 
  activeSection, 
  onChangeSection, 
  isOpen, 
  toggleSidebar, 
  customMenuItems, 
  onBack,
  variant,
}: SidebarProps) {
  const isOverview = variant === 'overview';
  const router = useRouter();
  const [itemsToShow, setItemsToShow] = useState<MenuItem[]>([]);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = Cookies.get('auth_token');
      if (!token) return;

      try {
        const decoded = jwtDecode<CustomJwtPayload>(token);
        const role = decoded.role || '';
        const sourceList = customMenuItems || GLOBAL_MENU_ITEMS;
        const filtered = sourceList.filter(item => {
          if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
          return item.allowedRoles.includes(role);
        });

        setUserRole(role);
        setItemsToShow(filtered);
      } catch {
        setItemsToShow([]);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [customMenuItems]);

  const handleLogout = () => {
    Cookies.remove('auth_token', { path: '/' });
    router.replace('/auth/login');
  };

  return (
    <>
      {isOpen && (
        <div className={isOverview ? "fixed inset-0 z-40 bg-slate-950/45 md:hidden" : "fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"} onClick={toggleSidebar} />
      )}

      <aside id={isOverview ? "overview-navigation" : undefined} className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-all duration-300 ease-in-out flex flex-col ${isOverview
        ? (isOpen ? 'w-56 translate-x-0 motion-reduce:transition-none' : 'w-[72px] invisible -translate-x-full md:visible md:translate-x-0 motion-reduce:transition-none')
        : (isOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0')}`}>
        <div className={isOverview ? "h-[76px] flex items-center justify-start pl-2 md:justify-center md:pl-0 border-b border-gray-100 relative shrink-0" : "h-20 flex items-center justify-center border-b border-gray-100 relative shrink-0"}>
          {onBack ? (
             <button onClick={onBack} className="flex items-center justify-center w-full h-full text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors gap-2">
                <ArrowLeft size={24} />
                {isOpen && <span className="font-bold text-sm">Voltar</span>}
             </button>
          ) : (
            <>
              <div className={isOverview ? "relative size-11 shrink-0" : "relative w-10 h-10"}>
                 <Image src="/icons/logo.png" alt={isOverview && isOpen ? "" : "Cerâmica Canelas"} fill sizes={isOverview ? "44px" : "40px"} className="object-contain" />
              </div>
              {isOpen && <span className={isOverview ? "ml-2 font-bold text-[15px] text-gray-900" : "ml-3 font-bold text-gray-800 text-lg animate-fade-in"}>Cerâmica Canelas</span>}
            </>
          )}
          <button onClick={toggleSidebar} aria-label="Fechar navegação" className={isOverview ? "absolute right-1.5 md:hidden p-1 text-slate-600" : "md:hidden absolute right-4 text-gray-500 hover:text-red-500"}><X size={isOverview ? 16 : 20} /></button>
        </div>

        <nav aria-label={isOverview ? "Módulos do sistema" : undefined} className={isOverview ? "p-3 pt-5 space-y-1 flex-1 overflow-y-auto" : "p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar"}>
          {itemsToShow.length === 0 && isOpen && (
             <div className="text-xs text-center text-gray-400 mt-4 px-2">Nenhum menu disponível.<br/><span className="font-mono text-[10px]">({userRole})</span></div>
          )}
          {itemsToShow.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={isOverview ? item.label : undefined}
                aria-current={isOverview && isActive ? "page" : undefined}
                title={isOverview && !isOpen ? item.label : undefined}
                onClick={() => {
                  onChangeSection(item.id);
                  if (typeof window !== 'undefined' && window.innerWidth < 768) toggleSidebar();
                }}
                className={isOverview ? `flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left transition-colors motion-reduce:transition-none ${isActive ? 'bg-[#fff1e6] font-semibold text-[#b93800]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${!isOpen ? 'justify-center' : ''}` : `w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative ${isActive ? 'bg-orange-50 text-orange-600 shadow-sm font-bold border border-orange-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'} ${!isOpen ? 'justify-center' : ''}`}
              >
                <item.icon size={isOverview ? 19 : 22} strokeWidth={isOverview ? (isActive ? 2.3 : 1.8) : (isActive ? 2.5 : 2)} aria-hidden="true" />
                {isOpen && <span className={isOverview ? "text-sm whitespace-nowrap" : "ml-3 font-medium text-sm whitespace-nowrap"}>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 shrink-0">
            <button type="button" onClick={handleLogout} aria-label={isOverview ? "Sair" : undefined} className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative text-gray-500 hover:bg-red-50 hover:text-red-600 border border-transparent ${!isOpen ? 'justify-center' : ''}`}>
              <LogOut size={22} strokeWidth={2} />
              {isOpen && <span className="ml-3 font-medium text-sm whitespace-nowrap">Sair</span>}
            </button>
        </div>
      </aside>
    </>
  );
}
