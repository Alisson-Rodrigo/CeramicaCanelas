import { Banknote, FileText, History, LogOut, Settings2, Ticket, UsersRound, X, type LucideIcon } from 'lucide-react';

export const employeePaymentScreens: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'people', label: 'Cadastro', icon: UsersRound },
  { id: 'calculation', label: 'Apuração', icon: Banknote },
  { id: 'absences', label: 'Faltas e conferência', icon: FileText },
  { id: 'hours', label: 'Horas do mês', icon: FileText },
  { id: 'vouchers', label: 'Vales', icon: Ticket },
  { id: 'history', label: 'Histórico e ajustes', icon: History },
  { id: 'reports', label: 'Relatórios e contador', icon: FileText },
  { id: 'rules', label: 'Parâmetros de bônus', icon: Settings2 },
];

interface EmployeePaymentsSidebarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBackToMain: () => void;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
}

export function EmployeePaymentsSidebar({ currentScreen, onNavigate, onBackToMain, onCloseMobile, isCollapsed = false }: EmployeePaymentsSidebarProps) {
  const getButtonClass = (screen: string) => `flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
    currentScreen === screen
      ? 'border-r-4 border-orange-500 bg-orange-50 text-orange-700'
      : 'text-slate-600 hover:bg-slate-50 hover:text-orange-700'
  }`;

  return <aside className={`flex h-full w-64 flex-col border-r border-slate-200 bg-white transition-all duration-300 ${isCollapsed ? 'md:w-20 md:[&_span]:hidden md:[&_nav_p]:hidden md:[&_nav_button]:justify-center md:[&_nav_button]:px-2' : 'md:w-64'}`}>
    <div className={`flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-6 ${isCollapsed ? 'md:justify-center md:px-3' : ''}`}>
      <div className='flex items-center gap-2'>
        <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 font-bold text-white shadow-sm'>P</div>
        <span className='text-lg font-bold text-slate-800'>Pagamentos</span>
      </div>
      <button type='button' onClick={onCloseMobile} className='text-slate-400 hover:text-orange-700 md:hidden' aria-label='Fechar menu'><X size={20} /></button>
    </div>

    <nav aria-label='Navegação de pagamentos' className='flex-1 space-y-6 overflow-y-auto p-4'>
      <div className='space-y-1'>
        <p className='mb-2 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400'>Gestão de pagamentos</p>
        {employeePaymentScreens.slice(0, 5).map(({ id, label, icon: Icon }) => <button key={id} type='button' title={isCollapsed ? label : undefined} aria-current={currentScreen === id ? 'page' : undefined} onClick={() => onNavigate(id)} className={getButtonClass(id)}><Icon size={18} aria-hidden='true' /><span>{label}</span></button>)}
      </div>
      <div className='space-y-1'>
        <p className='mb-2 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400'>Consultas e parâmetros</p>
        {employeePaymentScreens.slice(5).map(({ id, label, icon: Icon }) => <button key={id} type='button' title={isCollapsed ? label : undefined} aria-current={currentScreen === id ? 'page' : undefined} onClick={() => onNavigate(id)} className={getButtonClass(id)}><Icon size={18} aria-hidden='true' /><span>{label}</span></button>)}
      </div>
    </nav>

    <div className='shrink-0 border-t border-slate-100 p-4'>
      <button type='button' onClick={onBackToMain} title={isCollapsed ? 'Voltar ao painel' : undefined} className={`flex w-full items-center justify-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-orange-50 hover:text-orange-700 ${isCollapsed ? 'md:px-2' : ''}`}>
        <LogOut size={18} className='rotate-180' aria-hidden='true' /><span>Voltar ao painel</span>
      </button>
    </div>
  </aside>;
}
