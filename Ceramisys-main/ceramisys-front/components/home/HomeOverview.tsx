'use client';

import Image from 'next/image';
import {
  ArrowRight, ArrowUpRight, Bell, ChartColumnIncreasing,
  Layers, ListChecks, PackagePlus, PackageSearch, ReceiptText, ShieldCheck, ShoppingCart, UserPlus,
} from 'lucide-react';
import { GLOBAL_MENU_ITEMS } from '@/components/Sidebar';
import styles from './home.module.css';

const descriptions: Record<string, string> = {
  inventory: 'Controle de insumos, materiais e movimentações de estoque.',
  kilns: 'Acompanhe queimas, produtos carregados e conferência de qualidade.',
  sales: 'Pedidos, clientes e acompanhamento de vendas.',
  finance: 'Contas a pagar, contas a receber e fluxo de caixa.',
  payments: 'Funcionários, vales, quinzenas e fechamentos mensais.',
  admin: 'Usuários, permissões e configurações do sistema.',
};

const shortcuts = [
  { module: 'sales', screen: 'new-sale', label: 'Nova venda', context: 'Vendas', icon: ShoppingCart },
  { module: 'finance', screen: 'transactions', label: 'Lançamentos financeiros', context: 'Financeiro', icon: ReceiptText },
  { module: 'inventory', screen: 'stock-in', label: 'Registrar entrada', context: 'Almoxarifado', icon: PackagePlus },
  { module: 'inventory', screen: 'products', label: 'Consultar produtos', context: 'Almoxarifado', icon: PackageSearch },
  { module: 'finance', screen: 'pending', label: 'Consultar pendências', context: 'Financeiro', icon: ListChecks },
  { module: 'admin', screen: 'users', label: 'Gerenciar usuários', context: 'Administração', icon: UserPlus },
];

const highlights = [
  { label: 'Processos integrados', icon: Layers },
  { label: 'Mais controle', icon: ChartColumnIncreasing },
  { label: 'Segurança dos dados', icon: ShieldCheck },
];

export function HomeOverview({ role, onOpen }: { role: string; onOpen: (module: string, screen?: string) => void }) {
  const modules = GLOBAL_MENU_ITEMS.filter(item => item.id !== 'overview' && item.allowedRoles?.includes(role));
  const actions = shortcuts.filter(item => modules.some(module => module.id === item.module));

  return (
    <div className={styles.home}>
      <section className={styles.banner} aria-labelledby="home-banner-title">
        <div className={styles.bannerArtwork}>
          <Image
            src="/images/dashboard-bricks.webp"
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 51vw, 45vw"
            preload
          />
        </div>
        <div className={styles.bannerCopy}>
          <p className={styles.bannerBrand}>Cerâmica Canelas</p>
          <h2 id="home-banner-title">Sistema Integrado<br className={styles.desktopBreak} /> de Gestão</h2>
          <p className={styles.bannerDescription}>Controle, organização e eficiência para a indústria cerâmica.</p>
          <ul className={styles.highlights}>
            {highlights.map(({ label, icon: Icon }) => (
              <li key={label}><Icon size={18} aria-hidden="true" /><span>{label}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="home-modules-title" className={styles.modules}>
        <h2 id="home-modules-title" className={styles.sectionTitle}>Módulos do sistema</h2>
        {modules.length > 0 ? (
          <ul className={styles.moduleGrid} data-count={modules.length}>
            {modules.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button type="button" className={styles.module} onClick={() => onOpen(id)} aria-label={'Abrir ' + label}>
                  <Icon className={styles.cardWatermark} size={100} strokeWidth={1.15} aria-hidden="true" />
                  <span className={styles.moduleIcon}><Icon size={24} strokeWidth={1.8} aria-hidden="true" /></span>
                  <strong>{label}</strong>
                  <span className={styles.moduleDescription}>{descriptions[id]}</span>
                  <span className={styles.cardArrow}><ArrowRight size={17} aria-hidden="true" /></span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.noModules}>
            <h3>Nenhum módulo disponível</h3>
            <p>Seu perfil não tem acesso aos módulos operacionais. Consulte o administrador para verificar suas permissões.</p>
          </div>
        )}
      </section>

      <div className={styles.lowerGrid}>
        {actions.length > 0 && (
          <section className={styles.surface} aria-labelledby="home-shortcuts-title">
            <h2 id="home-shortcuts-title" className={styles.sectionTitle}>Ações rápidas</h2>
            <ul className={styles.shortcutList}>
              {actions.map(({ module, screen, icon: Icon, label, context }) => (
                <li key={module + screen}>
                  <button type="button" onClick={() => onOpen(module, screen)}>
                    <span className={styles.shortcutIcon}><Icon size={18} aria-hidden="true" /></span>
                    <span className={styles.shortcutLabel}><strong>{label}</strong><small>{context}</small></span>
                    <ArrowUpRight size={16} className={styles.shortcutArrow} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className={styles.surface} aria-labelledby="home-notices-title">
          <h2 id="home-notices-title" className={styles.sectionTitle}>Avisos e comunicados</h2>
          <div className={styles.noticeEmpty}>
            <Bell size={21} strokeWidth={1.7} aria-hidden="true" />
            <p>Nenhum comunicado disponível.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
