'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { EmployeePaymentsSidebar, employeePaymentScreens as screens } from './EmployeePaymentsSidebar';
import { EmployeePeriod, employeePayments as service } from '@/lib/employee-payments';
import { money } from '@/lib/payments';
import { useEmployeeQuery } from './hooks';
import { dateLabel, Empty, Field, input, Notice, Section } from './ui';
import { EmployeePeople } from './EmployeePeople';
import { EmployeeVouchers } from './EmployeeVouchers';
import { EmployeeHours } from './EmployeeHours';
import { EmployeeAbsences } from './EmployeeAbsences';
import { EmployeeCalculation } from './EmployeeCalculation';
import { EmployeeHistory } from './EmployeeHistory';
import { EmployeeReports } from './EmployeeReports';
export function EmployeePaymentsAccess() {
  const router = useRouter();
  const [access, setAccess] = useState<{ allowed: boolean } | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = Cookies.get('auth_token'); if (!raw) { router.replace('/auth/login'); return; }
        const claims = jwtDecode<{ exp?: number; role?: string | string[] }>(raw);
        if (!claims.exp || claims.exp * 1000 <= Date.now()) { router.replace('/auth/login?session=expired'); return; }
        const roles = Array.isArray(claims.role) ? claims.role : [claims.role];
        setAccess({ allowed: roles.some(role => role === 'Financial' || role === 'Admin') });
      } catch { router.replace('/auth/login?session=expired'); }
    }, 0);
    return () => clearTimeout(timer);
  }, [router]);
  if (!access) return <main className='p-8'><p role='status'>Verificando acesso…</p></main>;
  if (!access.allowed) return <main className='space-y-4 p-8'><h1 className='text-xl font-semibold'>Acesso não permitido</h1><p>Este módulo exige perfil Financeiro ou Administrador.</p><Link className='text-orange-800 underline' href='/dashboard'>Voltar ao painel</Link></main>;
  return <EmployeePaymentsModule />;
}
export function EmployeePaymentsModule() {
  const router = useRouter(); const now = new Date();
  const [scope, setScope] = useState<EmployeePeriod>({ personId: '', year: now.getFullYear(), month: now.getMonth() + 1, fortnight: 1 });
  const [historicalName, setHistoricalName] = useState(''); const [screen, setScreen] = useState('people');
  const [version, setVersion] = useState(0); const refresh = useCallback(() => setVersion(value => value + 1), []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedScreen = localStorage.getItem('employeePaymentsActiveScreen');
      if (savedScreen && screens.some(item => item.id === savedScreen)) setScreen(savedScreen);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const people = useEmployeeQuery('employee-people:' + version, signal => service.people(signal));
  const selected = people.data?.find(person => person.id === scope.personId);
  const select = (id: string, name: string) => { setScope(current => ({ ...current, personId: id })); setHistoricalName(name); setScreen('calculation'); localStorage.setItem('employeePaymentsActiveScreen', 'calculation'); };
  const resourceKey = JSON.stringify(scope);
  const navigate = (id: string) => {
    setScreen(id);
    localStorage.setItem('employeePaymentsActiveScreen', id);
    if (window.innerWidth < 768) setIsMobileMenuOpen(false);
  };
  return <div className='flex h-dvh min-h-0 overflow-hidden bg-slate-50 font-sans text-slate-800'>
    {isMobileMenuOpen && <div className='fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden' onClick={() => setIsMobileMenuOpen(false)} />}
    <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-all duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${isDesktopSidebarOpen ? 'md:w-64' : 'md:w-20'}`}>
      <div className={`${isDesktopSidebarOpen ? 'md:w-64' : 'md:w-20'} h-full w-64 transition-all duration-300`}>
        <EmployeePaymentsSidebar currentScreen={screen} onNavigate={navigate} onBackToMain={() => router.push('/dashboard')} onCloseMobile={() => setIsMobileMenuOpen(false)} isCollapsed={!isDesktopSidebarOpen} />
      </div>
    </div>
    <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
      <header className='flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-4'>
        <button type='button' onClick={() => window.innerWidth < 768 ? setIsMobileMenuOpen(open => !open) : setIsDesktopSidebarOpen(open => !open)} className='rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-orange-700' aria-label='Alternar menu de pagamentos'><Menu size={24} /></button>
        <span className='ml-4 font-bold text-slate-800'>Pagamentos</span>
        <div className='ml-auto flex items-center gap-2'><NotificationBell /><ThemeToggle /></div>
      </header>
      <main className='app-content-enter flex-1 space-y-5 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8'>
        <div className='flex flex-wrap items-center justify-between gap-3'><h1 className='text-2xl font-semibold'>{screens.find(item => item.id === screen)?.label}</h1><Button variant='outline' disabled={people.loading} onClick={refresh}>Atualizar dados</Button></div>
        <Notice loading={people.loading} error={people.error} />
        <div className='grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]'>
          <Field label='Funcionário'><select className={input} value={scope.personId} onChange={e => { setScope({ ...scope, personId: e.target.value }); setHistoricalName(''); }}><option value=''>{['history','reports'].includes(screen) ? 'Todos os funcionários' : 'Selecione um funcionário'}</option>{scope.personId && !selected && <option value={scope.personId}>{historicalName || scope.personId} (histórico)</option>}{people.data?.map(person => <option key={person.id} value={person.id}>{person.name}{person.isActive ? '' : ' (inativo)'}</option>)}</select></Field>
          <Field label='Competência'><input type='month' min='2000-01' max='9999-12' className={input} value={scope.year + '-' + String(scope.month).padStart(2, '0')} onChange={e => { const [year, month] = e.target.value.split('-').map(Number); if (year >= 2000 && year <= 9999 && month >= 1 && month <= 12) setScope({ ...scope, year, month }); }} /></Field>
          <Field label='Quinzena'><select className={input} value={scope.fortnight} onChange={e => setScope({ ...scope, fortnight: Number(e.target.value) as 1 | 2 })}><option value={1}>Primeira (1 a 15)</option><option value={2}>Segunda (16 ao fim do mês)</option></select></Field>
        </div>
        {scope.personId && !people.loading && (!selected || !selected.isActive) && <p className='text-sm text-amber-800'>Cadastro inativo ou fora da lista atual: consultas históricas permanecem disponíveis. Novas apurações e concessões de vale estão desabilitadas.</p>}
        {screen === 'people' && <EmployeePeople people={people.data ?? []} loading={people.loading} loadError={!!people.error} onChanged={refresh} onSelect={select} />}
        {screen === 'rules' && <EmployeeRules version={version} />}
        {screen === 'reports' && <EmployeeReports key={resourceKey} scope={scope} version={version} onChanged={refresh} />}
        {screen === 'history' && <EmployeeHistory key={resourceKey} scope={scope} version={version} onChanged={refresh} onSelect={select} />}
        {!['people','rules','history','reports'].includes(screen) && (!scope.personId ? <Section title='Selecione um funcionário'><p className='text-sm'>Escolha o cadastro financeiro para consultar esta tarefa.</p></Section> : <div key={resourceKey}>
          {screen === 'calculation' && <EmployeeCalculation scope={scope} version={version} active={selected?.isActive === true} onChanged={refresh} />}
          {screen === 'hours' && <EmployeeHours scope={scope} version={version} onChanged={refresh} />}
          {screen === 'absences' && <EmployeeAbsences scope={scope} version={version} onChanged={refresh} />}
          {screen === 'vouchers' && <EmployeeVouchers scope={scope} version={version} active={selected?.isActive === true} onChanged={refresh} />}
        </div>)}
      </main>
    </div>
  </div>;
}
function EmployeeRules({ version }: { version: number }) {
  const query = useEmployeeQuery('employee-bonus-rules:' + version, signal => service.rules(signal));
  return <Section title='Parâmetros de bonificação por vigência'><p className='text-sm text-slate-600'>Somente consulta. A configuração exibida não comprova a regra exata utilizada em um fechamento antigo; a memória salva permanece a referência.</p><Notice loading={query.loading} error={query.error} />{query.data?.length === 0 && <Empty />}{query.data && <div className='overflow-x-auto'><table className='w-full min-w-[420px] text-left text-sm'><thead><tr><th className='p-2'>Vigência</th><th className='p-2'>Redução por falta inteira</th><th className='p-2'>Redução por meia falta</th></tr></thead><tbody>{query.data.map(rule => <tr key={rule.id} className='border-t border-slate-100'><td className='p-2'>{dateLabel(rule.effectiveFrom)}</td><td className='p-2'>{money(rule.fullAbsenceValue)}</td><td className='p-2'>{money(rule.halfAbsenceValue)}</td></tr>)}</tbody></table></div>}</Section>;
}
