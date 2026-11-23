'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar, GLOBAL_MENU_ITEMS } from '@/components/Sidebar';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { KilnControl } from './KilnControl';
import styles from '@/components/home/home.module.css';

const productionMenuItems = GLOBAL_MENU_ITEMS.filter(item => item.id === 'kilns');

export function KilnLayout({ onBackToMain, onManageEmployees }: { onBackToMain: () => void; onManageEmployees: () => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsSidebarOpen(!mobile.matches);
    sync();
    mobile.addEventListener('change', sync);
    return () => mobile.removeEventListener('change', sync);
  }, []);

  return (
    <div className={styles.shell}>
      <Sidebar
        variant="overview"
        customMenuItems={productionMenuItems}
        activeSection="kilns"
        onChangeSection={section => { if (section === 'overview') onBackToMain(); }}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(value => !value)}
      />
      <div className={styles.workspace} data-nav-open={isSidebarOpen}>
        <header className={styles.topbar}>
          <div className={styles.headerTitle}>
            <button type="button" onClick={() => setIsSidebarOpen(value => !value)} aria-label="Alternar navegação" aria-expanded={isSidebarOpen} className={styles.menuToggle}>
              <Menu size={20} aria-hidden="true" />
            </button>
            <div>
              <h1>Produção</h1>
              <p>Controle de fornos, queimas e qualidade dos produtos.</p>
            </div>
          </div>
          <div className={styles.account}>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>
        <main className={styles.content + ' app-content-enter'}>
          <KilnControl onManageEmployees={onManageEmployees} />
        </main>
      </div>
    </div>
  );
}
