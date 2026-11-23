'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { api } from '@/lib/api';
import { decimal, formData, money, payments } from '@/lib/payments';
import { getApiErrorMessage } from '@/lib/api-error';
import type { PaymentPerson } from './Payments';
import { AuditedDeleteAction } from '../AuditedDeleteAction';
import { Button } from '@/components/ui/Button';

const input = 'w-full rounded-lg border border-slate-300 p-2 text-sm disabled:bg-slate-100';
const blank = { name: '', employmentType: '1', monthlyValue: '', monthlyBonus: '0', admissionDate: '', contractualDsrAuthorized: false, employeeId: '' };
export function FinancialPeople({ people, loading, onChanged, onReload }: { people: PaymentPerson[]; loading: boolean; onChanged: () => void; onReload: () => Promise<void> }) {
  const [form, setForm] = useState(blank); const [editing, setEditing] = useState<PaymentPerson | null>(null);
  const [category, setCategory] = useState(1); const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]); const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false); const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    try {
      const claims = jwtDecode<{ role?: string | string[] }>(Cookies.get('auth_token') ?? '');
      const roles = Array.isArray(claims.role) ? claims.role : [claims.role];
      if (roles.some(r => r === 'Admin' || r === 'Almoxarifado')) api.get('/api/employees/pages', { params: { Page: 1, PageSize: 1000 }, signal: controller.signal }).then(r => setEmployees(r.data.items)).catch(() => { if (!controller.signal.aborted) setMessage('Cadastro operacional indisponível. O cadastro financeiro pode ser usado sem vínculo.'); });
    } catch { /* Session guard is owned by the dashboard. */ }
    return () => controller.abort();
  }, []);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage('');
    try { await action(); onChanged(); } catch (e) { setMessage(e instanceof Error && !('response' in e) ? e.message : getApiErrorMessage(e)); }
    finally { lock.current = false; setBusy(false); }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault(); void run(async () => {
      const value = decimal(form.monthlyValue); if (value <= 0) throw new Error('O valor mensal deve ser maior que zero.');
      const data = formData({ MonthlyValue: value, MonthlyBonus: decimal(form.monthlyBonus), AdmissionDate: form.admissionDate || undefined, ContractualDsrAuthorized: form.employmentType === '2' && form.contractualDsrAuthorized });
      if (editing) await payments.patch(`/people/${editing.id}/salary`, data);
      else { data.append('Name', form.name.trim()); data.append('EmploymentType', form.employmentType); if (form.employmentType === '1' && form.employeeId) data.append('EmployeeId', form.employeeId); await payments.post('/people', data); }
      setEditing(null); setForm(blank); setMessage('Cadastro financeiro salvo.');
    });
  };
  return <div className='space-y-5'>
    <p className='text-sm text-slate-600'>O cadastro financeiro é independente do operacional. Nome, categoria e vínculo não podem ser alterados após a criação. A admissão é informativa e não gera proporcionalização.</p>
    <p role='status' className='whitespace-pre-wrap text-sm text-slate-800'>{message}</p>
    <form onSubmit={submit} className='rounded-xl border border-slate-200 bg-white p-5'>
      <h2 className='mb-4 font-bold'>{editing ? `Editar valores — ${editing.name}` : 'Cadastrar pessoa financeira'}</h2>
      <fieldset disabled={busy} className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <label>Nome<input required maxLength={150} disabled={!!editing} className={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>Categoria<select disabled={!!editing} className={input} value={form.employmentType} onChange={e => setForm({ ...form, employmentType: e.target.value, employeeId: '', contractualDsrAuthorized: false })}><option value='1'>Funcionário</option><option value='2'>Prestador</option></select></label>
        <label>Salário / contrato mensal<input required type='number' min='0.01' step='0.01' className={input} value={form.monthlyValue} onChange={e => setForm({ ...form, monthlyValue: e.target.value })} /></label>
        <label>Bônus mensal<input required type='number' min='0' step='0.01' className={input} value={form.monthlyBonus} onChange={e => setForm({ ...form, monthlyBonus: e.target.value })} /></label>
        <label>Admissão (opcional)<input type='date' className={input} value={form.admissionDate} onChange={e => setForm({ ...form, admissionDate: e.target.value })} />{editing && <small>Deixar vazio preserva a data anterior.</small>}</label>
        {form.employmentType === '2' && <label className='self-center'><input type='checkbox' checked={form.contractualDsrAuthorized} onChange={e => setForm({ ...form, contractualDsrAuthorized: e.target.checked })} /> Autorização contratual individual de DSR</label>}
        {!editing && form.employmentType === '1' && employees.length > 0 && <label>Vínculo operacional opcional<select className={input} value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}><option value=''>Sem vínculo</option>{employees.map(x => <option key={x.id} value={x.id}>{x.name} — {x.id}</option>)}</select></label>}
      </fieldset>
      <div className='mt-4 flex gap-2'><Button type='submit' disabled={busy}>Salvar</Button>{editing && <Button type='button' variant='outline' onClick={() => { setEditing(null); setForm(blank); }}>Cancelar edição</Button>}</div>
    </form>
    <section className='rounded-xl border border-slate-200 bg-white p-4'>
      {loading && <p role='status'>Carregando pessoas…</p>}
      <div className='mb-4 flex flex-wrap gap-2'>{[1, 2].map(n => <Button key={n} variant={category === n ? 'primary' : 'outline'} onClick={() => setCategory(n)}>{n === 1 ? 'Funcionários' : 'Prestadores'}</Button>)}<input aria-label='Buscar pessoa' placeholder='Buscar por nome' className={input + ' max-w-xs'} value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className='overflow-x-auto'><table className='w-full min-w-[800px] text-left text-sm'><thead><tr>{['Nome', 'Situação', 'Mensal', 'Bônus', 'Admissão', 'DSR autorizado', 'Ações'].map(x => <th className='p-2' key={x}>{x}</th>)}</tr></thead><tbody>
        {people.filter(x => x.employmentType === category && x.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(p => <tr key={p.id} className='border-t border-slate-100'><td className='p-2'>{p.name}</td><td>{p.isActive ? 'Ativa' : 'Inativa'}</td><td>{money(p.monthlyValue ?? 0)}</td><td>{money(p.monthlyBonus)}</td><td>{p.admissionDate ?? '—'}</td><td>{p.employmentType === 2 ? p.contractualDsrAuthorized ? 'Sim' : 'Não' : 'Não se aplica'}</td><td className='flex gap-2 p-2'><Button size='sm' disabled={busy} onClick={() => { setEditing(p); setForm({ ...blank, name: p.name, employmentType: String(p.employmentType), monthlyValue: String(p.monthlyValue), monthlyBonus: String(p.monthlyBonus), admissionDate: p.admissionDate ?? '', contractualDsrAuthorized: p.contractualDsrAuthorized }); }}>Editar valores</Button><Button size='sm' variant='outline' disabled={busy} onClick={() => void run(async () => { await payments.patch(`/people/${p.id}/status`, formData({ IsActive: !p.isActive })); })}>{p.isActive ? 'Inativar' : 'Ativar'}</Button><AuditedDeleteAction path={'/people/' + p.id} label='Excluir trabalhador' subject={p.name} explanation={'Remove este cadastro financeiro da lista, sem apagar o funcionário operacional, pagamentos, apurações, faltas ou auditorias. Não há restauração disponível. Guarde o ID para consultas históricas: ' + p.id} disabled={busy || loading} onBusyChange={setBusy} onDeleted={() => { if (editing?.id === p.id) { setEditing(null); setForm(blank); } setMessage('Trabalhador removido da lista. Histórico preservado para o ID ' + p.id); }} onRefresh={onReload} /></td></tr>)}
      </tbody></table></div>
      {!loading && !people.some(p => p.employmentType === category) && <p className='p-4'>Nenhuma pessoa nesta categoria.</p>}
    </section>
  </div>;
}
