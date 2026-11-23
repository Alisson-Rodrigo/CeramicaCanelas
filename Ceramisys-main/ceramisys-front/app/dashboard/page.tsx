'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import localFont from 'next/font/local';
import { Menu, Loader2 } from 'lucide-react'; 
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';


// --- IMPORTAÇÕES DOS MÓDULOS ---
import { Sidebar, GLOBAL_MENU_ITEMS } from '@/components/Sidebar';
import { HomeOverview } from '@/components/home/HomeOverview';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import styles from '@/components/home/home.module.css';

const overviewFont = localFont({ src: '../auth/login/fonts/geist-latin.woff2', weight: '100 900', display: 'swap' });

const ModuleLoading = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
    <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-3" />
    <p className="text-sm font-medium text-slate-500">Carregando módulo...</p>
  </div>
);

const InventoryLayout = dynamic(
  () => import('@/components/inventory/InventoryLayout').then((module) => module.InventoryLayout),
  { loading: ModuleLoading },
);
const SalesLayout = dynamic(
  () => import('@/components/sales/SalesLayout').then((module) => module.SalesLayout),
  { loading: ModuleLoading },
);
const FinanceLayout = dynamic(
  () => import('@/components/finance/FinanceLayout').then((module) => module.FinanceLayout),
  { loading: ModuleLoading },
);
const AdminLayout = dynamic(
  () => import('@/components/admin/AdminLayout').then((module) => module.AdminLayout),
  { loading: ModuleLoading },
);
const KilnLayout = dynamic(
  () => import('@/components/kilns/KilnLayout').then((module) => module.KilnLayout),
  { loading: ModuleLoading },
);

// ==================================================================
// TIPAGEM DO TOKEN
// ==================================================================
interface CustomJwtPayload {
  unique_name: string; 
  role: string;        
  email: string;       
  nameid?: string;
  nbf?: number;
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string;
}

// ==================================================================
// 1. COMPONENTE DE VISÃO GERAL (DASHBOARD HOME)
// ==================================================================

export default function DashboardPage() {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState('overview'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Estados do Usuário Logado
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userInitials, setUserInitials] = useState('');

  // ========================================================
  // FUNÇÃO PARA ATUALIZAR O MÓDULO ATIVO E SALVAR NO localStorage
  // ========================================================
  const handleChangeModule = (module: string) => {
    if (module === 'inventory' && localStorage.getItem('inventoryActiveScreen') === 'kilns') localStorage.setItem('inventoryActiveScreen', 'home');
    if (module === 'payments' || module === 'employee-payments') { localStorage.setItem('activeModule', 'overview'); router.push('/dashboard/payments'); return; }
    setActiveModule(module);
    localStorage.setItem('activeModule', module);
  };

  const openFromHome = (module: string, screen?: string) => {
    if (!GLOBAL_MENU_ITEMS.some(item => item.id === module && item.allowedRoles?.includes(userRole))) return;
    if (screen) localStorage.setItem(module + 'ActiveScreen', screen);
    handleChangeModule(module);
  };

  useEffect(() => {
    const checkAuth = () => {
      const token = Cookies.get('auth_token');

      if (!token) {
        console.log("Token não encontrado. Redirecionando...");
        router.replace('/auth/login');
      } else {
        // --- DECODIFICA O TOKEN E ATUALIZA O ESTADO ---
        try {
            const decoded = jwtDecode<CustomJwtPayload>(token);

            if (!decoded.exp || decoded.exp * 1000 <= Date.now()) {
              Cookies.remove('auth_token', { path: '/' });
              router.replace('/auth/login?session=expired');
              return;
            }
            
            // Mapeia os campos do token
            const name = decoded.unique_name || 'Usuário';
            const role = decoded.role || 'Visitante';

            setUserName(name);
            setUserRole(role);
            
            // Lógica para Iniciais (Ex: "Jorge Luis" -> "JL")
            let initials = 'US';
            if (name) {
                const parts = name.trim().split(' ');
                if (parts.length === 1) {
                    initials = parts[0].substring(0, 2).toUpperCase();
                } else {
                    initials = (parts[0][0] + parts[1][0]).toUpperCase();
                }
            }
            setUserInitials(initials);

        } catch (error) {
            console.error("Erro ao decodificar token:", error);
            setUserName('Erro Token');
            setUserInitials('ER');
        }

        // ========================================================
        // RESTAURA O MÓDULO ATIVO DO localStorage
        // ========================================================
        const savedModule = localStorage.getItem('activeModule');
        if (savedModule === 'payments' || savedModule === 'employee-payments') { localStorage.setItem('activeModule', 'overview'); router.replace('/dashboard/payments'); return; }
        if (savedModule === 'inventory' && localStorage.getItem('inventoryActiveScreen') === 'kilns') {
          localStorage.setItem('inventoryActiveScreen', 'home');
          setActiveModule('kilns');
        } else if (savedModule === 'kilns') {
          setActiveModule('kilns');
        } else if (savedModule === 'assistant') {
          localStorage.setItem('activeModule', 'overview');
          setActiveModule('overview');
        } else if (savedModule) {
          setActiveModule(savedModule);
        }

        setIsLoading(false);
      }
    };

    const timeout = setTimeout(() => {
        checkAuth();
    }, 100);

    return () => clearTimeout(timeout);
  }, [router]);

  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 767px)');
    const syncSidebar = () => setIsSidebarOpen(!mobileViewport.matches);
    const task = window.setTimeout(syncSidebar, 0);
    mobileViewport.addEventListener('change', syncSidebar);
    return () => {
      window.clearTimeout(task);
      mobileViewport.removeEventListener('change', syncSidebar);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Verificando credenciais...</p>
      </div>
    );
  }

  // --- ROTEAMENTO DOS MÓDULOS DE TELA CHEIA ---
  if (activeModule === 'inventory') return <InventoryLayout onBackToMain={() => handleChangeModule('overview')} />;
  if (activeModule === 'kilns') return <KilnLayout onBackToMain={() => handleChangeModule('overview')} onNavigateModule={handleChangeModule} onManageEmployees={() => { localStorage.setItem('inventoryActiveScreen', 'employees'); handleChangeModule('inventory'); }} />;
  if (activeModule === 'sales') return <SalesLayout onBackToMain={() => handleChangeModule('overview')} />;
  if (activeModule === 'finance') return <FinanceLayout onBackToMain={() => handleChangeModule('overview')} />;
  // --- MÓDULO ADMINISTRATIVO ---
  if (activeModule === 'admin' && userRole === 'Admin') {
      return <AdminLayout onBackToMain={() => handleChangeModule('overview')} />;
  }

  return (
    <div
      className={styles.shell + ' ' + overviewFont.className}
      onKeyDown={event => {
        if (event.key === 'Escape' && isSidebarOpen) {
          setIsSidebarOpen(false);
          document.getElementById('overview-menu-toggle')?.focus();
        }
      }}
    >
      <Sidebar
        variant="overview"
        activeSection="overview"
        onChangeSection={openFromHome}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(value => !value)}
      />

      <div className={styles.workspace} data-nav-open={isSidebarOpen}>
        <header className={styles.topbar}>
          <div className={styles.headerTitle}>
            <button
              id="overview-menu-toggle"
              type="button"
              onClick={() => setIsSidebarOpen(value => !value)}
              aria-label="Alternar navegação"
              aria-expanded={isSidebarOpen}
              aria-controls="overview-navigation"
              className={styles.menuToggle}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <div>
              <h1>Visão Geral</h1>
              <p>Acompanhe o sistema e acesse os módulos da Cerâmica Canelas.</p>
            </div>
          </div>
          <div className={styles.account} aria-label={userName + ' · ' + userRole}>
            <NotificationBell />
            <ThemeToggle />
            <div className={styles.accountDetails}><strong>{userName}</strong><small>{userRole}</small></div>
            <span className={styles.avatar} aria-hidden="true">{userInitials}</span>
          </div>
        </header>
        <main className={styles.content + ' app-content-enter'}>
          <HomeOverview role={userRole} onOpen={openFromHome} />
        </main>
      </div>
    </div>
  );
}
