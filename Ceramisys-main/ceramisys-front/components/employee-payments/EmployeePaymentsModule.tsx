'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/navigation';
import { Banknote, FileText, History, Menu, Settings2, Ticket, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Sidebar } from '@/components/Sidebar';
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
const screens = [
  { id: 'people', label: 'Cadastro', icon: UsersRound },
  { id: 'calculation', label: 'Apuração', icon: Banknote },
  { id: 'absences', label: 'Faltas e conferência', icon: FileText },
  { id: 'hours', label: 'Horas do mês', icon: FileText },
  { id: 'vouchers', label: 'Vales', icon: Ticket },
  { id: 'history', label: 'Histórico e ajustes', icon: History },
  { id: 'reports', label: 'Relatórios e contador', icon: FileText },
  { id: 'rules', label: 'Parâmetros de bônus', icon: Settings2 },
];
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
  const [open, setOpen] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setOpen(window.innerWidth >= 768), 0); return () => clearTimeout(timer); }, []);
  const people = useEmployeeQuery('employee-people:' + version, signal => service.people(signal));
  const selected = people.data?.find(person => person.id === scope.personId);
  const select = (id: string, name: string) => { setScope(current => ({ ...current, personId: id })); setHistoricalName(name); setScreen('calculation'); };
  const resourceKey = JSON.stringify(scope);
  const navigate = (id: string) => { setScreen(id); if (window.innerWidth < 768) setOpen(false); };
  return <div className='min-h-dvh bg-slate-50 font-sans text-slate-800'>
    <Sidebar activeSection={screen} onChangeSection={navigate} isOpen={open} toggleSidebar={() => setOpen(value => !value)} customMenuItems={screens} onBack={() => router.push('/dashboard')} />
    <div className={open ? 'min-w-0 md:ml-64' : 'min-w-0 md:ml-20'}>
      <header className='flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4'><button type='button' onClick={() => setOpen(value => !value)} className='rounded-lg p-2 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-orange-700' aria-label='Alternar menu de funcionários'><Menu size={22} /></button><span className='font-semibold'>Pagamentos</span></header>
      <main className='space-y-5 p-3 sm:p-5 lg:p-8'>
        <nav aria-label='Abas de pagamentos' className='border-b border-slate-200'><Link href='/dashboard/payments' aria-current='page' className='inline-block border-b-2 border-orange-700 px-3 py-3 text-sm font-semibold text-orange-800 focus-visible:outline-2 focus-visible:outline-orange-700'>Funcionários</Link></nav>
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
