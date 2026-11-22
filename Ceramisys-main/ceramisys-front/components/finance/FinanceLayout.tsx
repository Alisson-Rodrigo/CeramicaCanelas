'use client';

import React, { useEffect, useState } from 'react';
import { FinanceSidebar } from './FinanceSidebar';
import { Menu } from 'lucide-react';

// --- IMPORTAÇÕES CORRIGIDAS (Pasta 'Views' com V maiúsculo) ---

// 1. Dashboards (Dentro de finance/Views/dashboards)
import { FinanceHome } from './Views/dashboards/FinanceHome';
import { CashFlowReport } from './Views/dashboards/CashFlowReport';
import { BalanceOutReport } from './Views/dashboards/BalanceOutReport';
import { BalanceInReport } from './Views/dashboards/BalanceInReport';
import { CustomerReport } from './Views/dashboards/CustomerReport';
import { StatementReport } from './Views/dashboards/StatementReport';
import { VerificationBalance } from './Views/dashboards/VerificationBalance';

// 2. Cadastros (Dentro de finance/Views/registrations)
import { FinancialCategories } from './Views/registrations/FinancialCategories';
import { Customers } from './Views/registrations/Customers';
import { MainCategories } from './Views/registrations/MainCategories';
import { RegisterStatement } from './Views/registrations/RegisterStatement';

// 3. Controles (Dentro de finance/Views/controls)
import { Transactions } from './Views/controls/Transactions';
import { PendingTransactions } from './Views/controls/PendingTransactions';

interface FinanceLayoutProps {
  onBackToMain: () => void;
}

export function FinanceLayout({ onBackToMain }: FinanceLayoutProps) {
  const [activeScreen, setActiveScreen] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedScreen = localStorage.getItem('financeActiveScreen');
      if (savedScreen) setActiveScreen(savedScreen);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // ========================================================
  // FUNÇÃO PARA MUDAR DE TELA E SALVAR NO localStorage
  // ========================================================
  const handleNavigate = (screen: string) => {
    setActiveScreen(screen);
    localStorage.setItem('financeActiveScreen', screen);
    if (window.innerWidth < 768) setIsMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeScreen) {
      case 'home': return <FinanceHome />;
      
      // Cadastros
      case 'categories': return <FinancialCategories />;
      case 'customers': return <Customers />;
      case 'main-categories': return <MainCategories />;
      case 'register-statement': return <RegisterStatement />;
      
      // Controles / Lançamentos
      case 'transactions': return <Transactions />;
      case 'pending': return <PendingTransactions />;
      
      // Relatórios
      case 'cash-flow': return <CashFlowReport />;
      case 'balance-out': return <BalanceOutReport />;
      case 'balance-in': return <BalanceInReport />;
      case 'report-customers': return <CustomerReport />;
      case 'report-statements': return <StatementReport />;
      case 'verification': return <VerificationBalance />;
      
      default: return <FinanceHome />;
    }
  };

  return (
    <div className="flex h-dvh min-h-0 bg-slate-50 overflow-hidden font-sans text-slate-800">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-all duration-300 md:relative md:translate-x-0 md:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${isDesktopSidebarOpen ? 'md:w-64' : 'md:w-20'}`}>
        <div className={`${isDesktopSidebarOpen ? 'md:w-64' : 'md:w-20'} w-64 h-full transition-all duration-300`}>
          <FinanceSidebar currentScreen={activeScreen} onNavigate={handleNavigate} onBackToMain={onBackToMain} onCloseMobile={() => setIsMobileMenuOpen(false)} isCollapsed={!isDesktopSidebarOpen} />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-4 shrink-0">
          <button onClick={() => window.innerWidth < 768 ? setIsMobileMenuOpen((open) => !open) : setIsDesktopSidebarOpen((open) => !open)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" aria-label="Alternar menu"><Menu size={24} /></button>
          <span className="ml-4 font-bold text-slate-800">Financeiro</span>
        </header>
        <main className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 md:p-6 lg:p-8">{renderContent()}</main>
      </div>
    </div>
  );
}
