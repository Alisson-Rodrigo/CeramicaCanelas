'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Banknote, Check, Download, FileText,
  Loader2, Plus, RefreshCw, Save, Search, X,
} from 'lucide-react';
import { AuditedDeleteAction } from '../AuditedDeleteAction';
import { PaymentWorkspace } from './PaymentWorkspace';
import { FinancialPeople } from './FinancialPeople';
import { activeCalculation, calculationCancellationBlock, calculationForm, decimal, localDate, payments, restoreCalculation, type Preparation, type History, type CalculationRequest } from '@/lib/payments';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { Button } from '@/components/ui/Button';

export type PaymentScreen = 'calculation' | 'people' | 'vouchers' | 'history' | 'rules' | 'occurrences';
type UnknownRecord = Record<string, unknown>;

export type PaymentPerson = import('@/lib/payments').PaymentPerson;

interface Voucher {
  id: string;
  paymentPersonId?: string;
  personName?: string;
  description?: string;
  totalValue?: number | null;
  installmentValue?: number;
  remainingBalance?: number | null;
  installmentCount?: number;
  periodicity?: number;
  status?: number;
  startYear?: number;
  startMonth?: number;
  intervalMonths?: number;
}

interface BreakdownItem {
  amount: number;
  kind?: number;
  description?: string;
  quantity?: number | null;
  quantityMinutes?: number | null;
  voucherId?: string | null;
  dsrWeekStart?: string | null; absenceId?: string | null;
}

interface Calculation {
  id?: string;
  paymentPersonId?: string;
  personName?: string;
  competenceYear?: number;
  competenceMonth?: number;
  fortnight?: number;
  baseValue?: number;
  firstFortnightValue?: number;
  secondFortnightValue?: number;
  monthlyTotalValue?: number;
  netValue?: number;
  fortnightPercent?: number;
  firstFortnightPaid?: number;
  grossValue?: number;
  additionValue?: number;
  deductionValue?: number;
  status?: number | string;
  calculatedAt?: string;
  paidAt?: string;
  items?: BreakdownItem[];
  installmentBase?: number; originalBonus?: number; bonusDeduction?: number; finalBonus?: number; absenceDeduction?: number; dsrWeeks?: number; dsrDeduction?: number;
}

interface PaymentRule {
  contractorAbsenceDailyValue?: number | null; contractorDsrValue?: number | null; halfAbsenceGeneratesDsr: boolean;
  id?: string;
  effectiveFrom?: string;
  employeeFirstFortnightPercent?: number;
  contractorFirstFortnightPercent?: number;
  fullAbsenceValue?: number;
  halfAbsenceValue?: number;
  monthlyWorkMinutes?: number;
  positiveHourMultiplier?: number;
  negativeHourMultiplier?: number;
  nightHourMultiplier?: number;
}

const screenTitles: Record<PaymentScreen, { title: string; description: string }> = {
  occurrences: { title: 'Ocorrências e acompanhamento', description: 'Faltas, resumo mensal, contador, ajustes, DSR e auditoria.' },
  calculation: { title: 'Cálculo de pagamento', description: 'Confira a memória e feche a quinzena. O pagamento é registrado separadamente.' },
  people: { title: 'Pessoas', description: 'Cadastre funcionários e prestadores e mantenha seus valores.' },
  vouchers: { title: 'Vales', description: 'Cadastre vales, parcelas e altere seus status.' },
  history: { title: 'Histórico de pagamentos', description: 'Consulte cálculos confirmados e registre pagamentos.' },
  rules: { title: 'Regras de cálculo', description: 'Consulte e crie novas vigências das regras.' },
};

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';
const panelClass = 'rounded-xl border border-slate-200 bg-white shadow-sm';

function unwrapList<T>(payload: unknown): T[] {
  if (!Array.isArray(payload)) throw new Error('Resposta inesperada: era esperada uma lista.');
  return payload as T[];
}

function asRecord(payload: unknown): UnknownRecord {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Resposta inesperada do servidor.');
  return payload as UnknownRecord;
}

function makeFormData(values: Record<string, string | number | boolean | null | undefined>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const monetary = ['TotalValue', 'InstallmentValue', 'FullAbsenceValue', 'HalfAbsenceValue', 'ContractorAbsenceDailyValue', 'ContractorDsrValue'].includes(key);
      data.append(key, monetary ? String(decimal(String(value))) : String(value));
    }
  });
  return data;
}

function postForm(url: string, data: FormData) {
  return api.post(url, data);
}

function patchForm(url: string, data: FormData) {
  return api.patch(url, data);
}

async function downloadPaymentPdf(path: string, params: Record<string, string | undefined>, fallbackName: string) {
  let response;
  try { response = await api.get<Blob>(path, { params, responseType: 'blob' }); }
  catch(error) {
    const e = error as { response?: { data: unknown } };
    if (e.response?.data instanceof Blob) { const text = await e.response.data.text(); try { e.response.data = JSON.parse(text); } catch { e.response.data = text; } }
    throw error;
  }
  const signature = await response.data.slice(0, 5).text();

  if (signature !== '%PDF-') {
    throw new Error('A API não retornou um PDF válido. Confira o ambiente e tente novamente.');
  }

  const fileName = /\.pdf$/i.test(fallbackName) ? fallbackName : `${fallbackName}.pdf`;
  const pdf = response.data.type === 'application/pdf'
    ? response.data
    : new Blob([response.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdf);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const brl = (value?: number | null) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0));
const dateBR = (value?: string) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${value.length === 10 ? `${value}T12:00:00` : value}`)) : '—';
const dateTimeBR = (value?: string) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
const today = localDate;
const monthLabel = (year?: number, month?: number) => year && month ? `${String(month).padStart(2, '0')}/${year}` : '—';
const parseDecimal = (value: string) => Number(value.trim().replace(',', '.'));
const getBaseValue = (person?: PaymentPerson) => Number(person?.monthlyValue ?? 0);
const getCalculationItems = (calculation?: Calculation | null) => calculation?.items ?? [];
const getCalculationTotal = (calculation?: Calculation | null) => calculation?.netValue ?? 0;

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={className}><span className={labelClass}>{label}</span>{children}</label>;
}

function Empty({ text }: { text: string }) {
  return <div className='px-4 py-10 text-center text-sm text-slate-500'>{text}</div>;
}

function LoadingRows({ columns }: { columns: number }) {
  return <tr><td colSpan={columns} className='p-10 text-center text-slate-500'><Loader2 className='mr-2 inline animate-spin' size={20} />Carregando...</td></tr>;
}

function Breakdown({ calculation }: { calculation: Calculation }) {
  const items = getCalculationItems(calculation);
  const negativeKinds = new Set([3, 4, 6, 8, 10, 12, 13]);
  return (
    <div className='space-y-3'>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
        {calculation.baseValue !== undefined && <SummaryValue label='Salário / contrato mensal' value={calculation.baseValue} />}
        {calculation.fortnightPercent !== undefined && <SummaryValue label='Percentual da quinzena' value={`${calculation.fortnightPercent}%`} />}
        {calculation.firstFortnightPaid !== undefined && <SummaryValue label='1ª quinzena fechada (não comprova pagamento)' value={calculation.firstFortnightPaid} />}
        {(['installmentBase', 'originalBonus', 'bonusDeduction', 'finalBonus', 'absenceDeduction', 'dsrDeduction'] as const).map((key) => calculation[key] !== undefined && <SummaryValue key={key} label={{ installmentBase: 'Parcela bruta', originalBonus: 'Bônus original', bonusDeduction: 'Redução do bônus', finalBonus: 'Bônus final', absenceDeduction: 'Faltas contratuais', dsrDeduction: 'DSR' }[key]} value={calculation[key]!} />)}
        {calculation.grossValue !== undefined && <SummaryValue label='Bruto' value={calculation.grossValue} />}
        {calculation.additionValue !== undefined && <SummaryValue label='Acréscimos' value={calculation.additionValue} tone='positive' />}
        {calculation.deductionValue !== undefined && <SummaryValue label='Descontos' value={calculation.deductionValue} tone='negative' />}
      </div>
      <div className='overflow-hidden rounded-xl border border-slate-200'>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[620px] text-left text-sm'>
          <thead className='bg-slate-100 text-xs uppercase text-slate-600'><tr><th className='p-3'>Descrição</th><th className='p-3 text-right'>Qtd.</th><th className='p-3 text-right'>Minutos</th><th className='p-3 text-center'>Sinal</th><th className='p-3 text-right'>Valor</th></tr></thead>
          <tbody className='divide-y divide-slate-100'>
            {items.length === 0 ? <tr><td colSpan={5} className='p-6 text-center text-slate-500'>A API não retornou itens para este demonstrativo.</td></tr> : items.map((item, index) => {
              const amount = Number(item.amount);
              const sign = item.kind === 2 ? 'Informativo' : (typeof item.kind === 'number' && negativeKinds.has(item.kind) ? '−' : '+');
              return <tr key={`${item.description}-${index}`}><td className='p-3 font-medium text-slate-700'>{item.description ?? 'Item'}{item.dsrWeekStart && <small className='block'>Semana iniciada em {item.dsrWeekStart}</small>}</td><td className='p-3 text-right'>{item.quantity ?? '—'}</td><td className='p-3 text-right'>{item.quantityMinutes ?? '—'}</td><td className={`p-3 text-center font-bold ${String(sign).includes('-') || String(sign).includes('−') ? 'text-red-600' : 'text-emerald-600'}`}>{sign}</td><td className='p-3 text-right font-bold'>{brl(Math.abs(amount))}</td></tr>;
            })}
          </tbody>
          <tfoot className='bg-slate-50'><tr><td colSpan={4} className='p-3 text-right font-bold text-slate-600'>Total calculado pela API</td><td className='p-3 text-right text-lg font-black text-slate-900'>{brl(getCalculationTotal(calculation))}</td></tr></tfoot>
        </table>
      </div>
      </div>
    </div>
  );
}

function SummaryValue({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'positive' | 'negative' }) {
  const color = tone === 'positive' ? 'text-emerald-700' : tone === 'negative' ? 'text-red-700' : 'text-slate-800';
  return <div className='rounded-lg border border-slate-200 bg-slate-50 p-3'><span className='block text-[10px] font-bold uppercase tracking-wide text-slate-500'>{label}</span><strong className={`mt-1 block text-sm ${color}`}>{typeof value === 'number' ? brl(value) : value}</strong></div>;
}

function AdjustmentEditor({ title, rows, onChange, disabled }: { title: string; rows: { description: string; amount: string }[]; onChange: (rows: { description: string; amount: string }[]) => void; disabled?: boolean }) {
  return (
    <div className='rounded-lg border border-slate-200 p-3'>
      <div className='mb-3 flex items-center justify-between'><span className='text-sm font-bold text-slate-700'>{title}</span><button type='button' disabled={disabled} onClick={() => onChange([...rows, { description: '', amount: '' }])} className='rounded-md p-1.5 text-blue-600 hover:bg-blue-50 disabled:opacity-40' aria-label={`Adicionar em ${title}`}><Plus size={17} /></button></div>
      <div className='space-y-2'>{rows.length === 0 && <p className='text-xs text-slate-400'>Nenhum item manual.</p>}{rows.map((row, index) => <div key={index} className='grid grid-cols-[1fr_110px_32px] gap-2'><input disabled={disabled} className={fieldClass} placeholder='Descrição' value={row.description} onChange={(e) => onChange(rows.map((item, i) => i === index ? { ...item, description: e.target.value } : item))} /><input disabled={disabled} className={fieldClass} type='text' inputMode='decimal' placeholder='0,00' value={row.amount} onChange={(e) => onChange(rows.map((item, i) => i === index ? { ...item, amount: e.target.value } : item))} /><button type='button' disabled={disabled} onClick={() => onChange(rows.filter((_, i) => i !== index))} className='text-red-500 disabled:opacity-40' aria-label='Remover item'><X size={18} /></button></div>)}</div>
    </div>
  );
}

export function Payments({ screen }: { screen: PaymentScreen }) {
  const now = new Date();
  const [people, setPeople] = useState<PaymentPerson[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [baseError, setBaseError] = useState('');

  const loadBaseData = useCallback(async (signal: AbortSignal) => {
    setLoadingBase(true);
    setBaseError('');
    try {
      const [peopleResponse, voucherResponse] = await Promise.allSettled([
        api.get('/api/payments/people', { signal }),
        api.get('/api/payments/vouchers', { signal }),
      ]);
      if (signal.aborted) return;
      if (peopleResponse.status === 'fulfilled') setPeople(unwrapList<PaymentPerson>(peopleResponse.value.data)); else setBaseError(previous => previous + ' Pessoas: ' + getApiErrorMessage(peopleResponse.reason));
      if (voucherResponse.status === 'fulfilled') setVouchers(unwrapList<Voucher>(voucherResponse.value.data)); else setBaseError(previous => previous + ' Vales: ' + getApiErrorMessage(voucherResponse.reason));
    } catch (error) {
      if (!signal.aborted) setBaseError(getApiErrorMessage(error, 'Não foi possível carregar os dados de pagamentos.'));
    } finally { setLoadingBase(false); }
  }, []);

  useEffect(() => { const controller = new AbortController(); void loadBaseData(controller.signal); return () => controller.abort(); }, [loadBaseData, refreshKey]);

  const refresh = () => setRefreshKey((key) => key + 1);
  const screenInfo = screenTitles[screen];

  return (
    <div className='space-y-5 pb-10'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div><h1 className='flex items-center gap-2 text-2xl font-black text-slate-800'><Banknote className='text-emerald-600' />{screenInfo.title}</h1><p className='mt-1 text-sm text-slate-500'>{screenInfo.description}</p></div>
        <Button variant='outline' icon={RefreshCw} onClick={refresh} disabled={loadingBase}>Atualizar</Button>
      </div>

      {baseError && <p role='alert' className='whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800'>{baseError}</p>}
      {screen === 'calculation' && <CalculationTab people={people} vouchers={vouchers} loading={loadingBase} onConfirmed={refresh} />}
      {screen === 'people' && <FinancialPeople people={people} loading={loadingBase} onChanged={refresh} onReload={async () => { const response = await payments.get<PaymentPerson[]>('/people'); setPeople(response); refresh(); }} />}
      {screen === 'vouchers' && <VouchersTab people={people} vouchers={vouchers} loading={loadingBase} onChanged={refresh} onReload={async () => { const response = await payments.get<Voucher[]>('/vouchers'); setVouchers(response); refresh(); }} />}
      {screen === 'history' && <HistoryTab people={people} defaultYear={now.getFullYear()} onChanged={refresh} />}
      {screen === 'rules' && <RulesTab />}
      {screen === 'occurrences' && <PaymentWorkspace people={people} />}
    </div>
  );
}

function CalculationTab({ people, vouchers, loading, onConfirmed }: { people: PaymentPerson[]; vouchers: Voucher[]; loading: boolean; onConfirmed: () => void }) {
  const now = new Date();
  const [form, setForm] = useState({ paymentPersonId: '', year: String(now.getFullYear()), month: String(now.getMonth() + 1), fortnight: '1', accountantAmount: '', positiveMinutes: '0', negativeMinutes: '0', nightMinutes: '0' });
  const [additions, setAdditions] = useState<{ description: string; amount: string }[]>([]);
  const [deductions, setDeductions] = useState<{ description: string; amount: string }[]>([]);
  const [excludedVouchers, setExcludedVouchers] = useState<string[]>([]);
  const [preview, setPreview] = useState<Calculation | null>(null);
  const [busy, setBusy] = useState<'preview' | 'confirm' | null>(null);
  const selectedPerson = people.find((person) => person.id === form.paymentPersonId);
  const isEmployee = selectedPerson?.employmentType === 1;
  const isSecond = form.fortnight === '2';
  const allowsVariableItems = Boolean(selectedPerson) && (!isEmployee || isSecond);
  const applicableVouchers = useMemo(() => {
    if (!isSecond || !selectedPerson) return [];
    return vouchers.filter((voucher) => voucher.paymentPersonId === selectedPerson.id && (voucher.status ?? 1) === 1);
  }, [isSecond, selectedPerson, vouchers]);

  const invalidate = () => setPreview(null);
  const update = (key: keyof typeof form, value: string) => { setForm((current) => ({ ...current, [key]: value })); invalidate(); };
  const serializedAdjustments = (rows: { description: string; amount: string }[]) => rows.map(row => {
    const amount = decimal(row.amount); if (!row.description.trim() || amount <= 0) throw new Error('Cada rubrica exige descrição e valor positivo.'); return { description: row.description.trim(), amount };
  });
  const request = (): CalculationRequest => {
    if (!form.paymentPersonId || !selectedPerson?.isActive) throw new Error('Selecione uma pessoa ativa.');
    if (!Number.isInteger(Number(form.year)) || Number(form.year) < 2000 || Number(form.year) > 9999) throw new Error('Ano deve estar entre 2000 e 9999.');
    if (!isEmployee && [form.positiveMinutes, form.negativeMinutes, form.nightMinutes].some(x => !Number.isInteger(Number(x)) || Number(x) < 0)) throw new Error('Minutos devem ser inteiros não negativos.');
    return ({
    paymentPersonId: form.paymentPersonId, competenceYear: Number(form.year), competenceMonth: Number(form.month), fortnight: Number(form.fortnight),
    bonusValue: 0, fullAbsences: 0, halfAbsences: 0,
    positiveMinutes: isEmployee ? 0 : Number(form.positiveMinutes), negativeMinutes: isEmployee ? 0 : Number(form.negativeMinutes), nightMinutes: isEmployee ? 0 : Number(form.nightMinutes),
    accountantAmount: isEmployee ? decimal(form.accountantAmount) : null,
    excludedVoucherIds: isSecond ? excludedVouchers : [], additions: allowsVariableItems ? serializedAdjustments(additions) : [], deductions: allowsVariableItems ? serializedAdjustments(deductions) : [],
  }); };
  const payload = () => closed ? makeFormData({ PaymentPersonId: form.paymentPersonId, CompetenceYear: form.year, CompetenceMonth: form.month, Fortnight: form.fortnight }) : calculationForm(request());
  const [preparation, setPreparation] = useState<Preparation | null>(null);
  const [closed, setClosed] = useState<History | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState(false);
  const [contextRefresh, setContextRefresh] = useState(0);
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const controller = new AbortController(); const version = ++generation.current;
    setPreview(null); setPreparation(null); setClosed(null); setAdditions([]); setDeductions([]); setExcludedVouchers([]);
    setForm(current => ({ ...current, accountantAmount: '', positiveMinutes: '0', negativeMinutes: '0', nightMinutes: '0' }));
    if (!form.paymentPersonId) return;
    setContextLoading(true); setContextError(false); setMessage('');
    const params = { personId: form.paymentPersonId, year: Number(form.year), month: Number(form.month), fortnight: Number(form.fortnight) };
    Promise.all([payments.get<Preparation | null>('/preparations', params, controller.signal), payments.get<History[]>('/calculations', params, controller.signal)]).then(([prep, history]) => {
      if (version !== generation.current) return;
      const active = activeCalculation(history);
      setPreparation(prep || null); setClosed(active);
      if (prep && !active) {
        const c = restoreCalculation(prep.requestJson);
        setForm(current => ({ ...current, accountantAmount: c.accountantAmount == null ? '' : String(c.accountantAmount), positiveMinutes: String(c.positiveMinutes ?? 0), negativeMinutes: String(c.negativeMinutes ?? 0), nightMinutes: String(c.nightMinutes ?? 0) }));
        setAdditions((c.additions ?? []).map(x => ({ ...x, amount: String(x.amount) }))); setDeductions((c.deductions ?? []).map(x => ({ ...x, amount: String(x.amount) }))); setExcludedVouchers(c.excludedVoucherIds ?? []);
      }
    }).catch(error => { if (!controller.signal.aborted) { setContextError(true); setMessage(getApiErrorMessage(error)); } }).finally(() => { if (version === generation.current) setContextLoading(false); });
    return () => { controller.abort(); };
  }, [form.paymentPersonId, form.year, form.month, form.fortnight, contextRefresh]);
  const savePreparation = async (inReview: boolean) => {
    if (lock.current || contextError || contextLoading) return; lock.current = true; setBusy('preview');
    try { const saved = await payments.post<Preparation>('/preparations', { calculation: request(), inReview, revision: preparation?.revision ?? 0 }); setPreparation(saved); setMessage(inReview ? 'Salvo em conferência.' : 'Salvo em aberto.'); }
    catch(error) { setMessage(error instanceof Error && !('response' in error) ? error.message : getApiErrorMessage(error));
      if (error && typeof error === 'object' && 'isAxiosError' in error) { setContextError(true); setMessage(previous => previous + ' Recarregue o período e reconfira os dados antes de salvar novamente.'); } }
    finally { lock.current = false; setBusy(null); }
  };

  const requestPreview = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.paymentPersonId) return alert('Selecione uma pessoa.');

    const invalidAdjustment = !closed && allowsVariableItems && [...additions, ...deductions].some((row) => !row.description.trim() || !Number.isFinite(parseDecimal(row.amount)) || parseDecimal(row.amount) <= 0);
    if (invalidAdjustment) return alert('Preencha a descrição e um valor maior que zero em todos os ajustes manuais.');
    if (lock.current || contextLoading || contextError) return;
    lock.current = true;
    const version = generation.current;
    setBusy('preview');
    try { const response = await postForm('/api/payments/calculations/preview', payload()); if (version === generation.current) setPreview(asRecord(response.data) as Calculation); }
    catch (error) { setPreview(null); setMessage(error instanceof Error && !('response' in error) ? error.message : getApiErrorMessage(error)); }
    finally { lock.current = false; setBusy(null); }
  };

  const confirm = async () => {
    if (!preview || closed || lock.current || contextError || contextLoading || !window.confirm('Fechar esta quinzena? O servidor recalcula os dados atuais. Esta ação preserva um snapshot e não registra pagamento.')) return;
    lock.current = true; setBusy('confirm');
    try {
      const saved = await payments.post<History>('/calculations', payload()); setClosed(saved);
      const snapshot = await payments.post<Calculation>('/calculations/preview', payload()); setPreview(snapshot);
      setMessage('Quinzena fechada. A memória exibida é a efetivamente salva. Pagamento deve ser registrado no histórico.'); onConfirmed();
    } catch (error) {
      setContextError(true);
      setMessage(getApiErrorMessage(error) + ' Consulte o histórico antes de tentar novamente.');
      try { const history = await payments.get<History[]>('/calculations', { personId: form.paymentPersonId, year: form.year, month: form.month, fortnight: form.fortnight }); const active = activeCalculation(history); if (active) { setClosed(active); setPreview(null); } } catch { setMessage('Não foi possível verificar o fechamento. Consulte o histórico antes de repetir.'); }
    } finally { lock.current = false; setBusy(null); }
  };

  return (
    <form onSubmit={requestPreview} className='grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]'>
      <section className={`${panelClass} p-4 sm:p-5`}>
        <h2 className='mb-4 font-bold text-slate-800'>Dados do cálculo</h2>
        {preparation?.id && !closed && [1, 5].includes(preparation.status) && <div className='mb-3'><AuditedDeleteAction key={preparation.id + ':' + preparation.revision} path={'/preparations/' + preparation.id} revision={preparation.revision} requiresRevision label='Excluir preparação' subject={selectedPerson?.name ?? form.paymentPersonId} explanation='Remove o rascunho ou a conferência e preserva seu conteúdo na auditoria. Se houver fechamento ativo, cancele primeiro a apuração não paga. Uma apuração paga não permite esta exclusão.' disabled={busy !== null || contextLoading || contextError} onBusyChange={value => { lock.current = value; setBusy(value ? 'preview' : null); }} onRefresh={async () => {
          await Promise.all([payments.get('/preparations', { personId: form.paymentPersonId, year: form.year, month: form.month, fortnight: form.fortnight }), payments.get('/calculations', { personId: form.paymentPersonId, year: form.year, month: form.month, fortnight: form.fortnight })]);
          setContextRefresh(value => value + 1); setPreview(null); onConfirmed();
        }} /></div>}
        {contextError && <Button type='button' onClick={() => setContextRefresh(x => x + 1)}>Recarregar período e preparação</Button>}<p role='status' className='mb-3 text-sm'>{message || (contextLoading ? 'Carregando período…' : closed ? 'Período fechado: memória somente para consulta.' : preparation?.status === 5 ? 'Em conferência' : 'Em aberto')}</p>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <Field label='Pessoa' className='sm:col-span-2 lg:col-span-1'><select required disabled={loading || busy !== null} className={fieldClass} value={form.paymentPersonId} onChange={(e) => update('paymentPersonId', e.target.value)}><option value=''>Selecione</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name} — {person.employmentType === 1 ? 'Funcionário' : 'Prestador'}</option>)}</select></Field>
          <Field label='Competência (ano)'><input required disabled={busy !== null} className={fieldClass} type='number' min='2000' max='9999' value={form.year} onChange={(e) => update('year', e.target.value)} /></Field>
          <Field label='Competência (mês)'><select disabled={busy !== null} className={fieldClass} value={form.month} onChange={(e) => update('month', e.target.value)}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2026, i, 1))}</option>)}</select></Field>
          <Field label='Quinzena'><select disabled={busy !== null} className={fieldClass} value={form.fortnight} onChange={(e) => update('fortnight', e.target.value)}><option value='1'>Primeira quinzena</option><option value='2'>Segunda quinzena</option></select></Field>
          <Field label='Mensal atual (cadastro)'><input className={fieldClass} readOnly value={brl(getBaseValue(selectedPerson))} /></Field>
          <Field label='Bônus atual (cadastro)'><input className={fieldClass} readOnly value={brl(selectedPerson?.monthlyBonus)} /></Field>
          {isEmployee && <Field label='Parcela informada pelo contador (sem bônus)'><input required={!closed} disabled={!!closed || busy !== null} type='number' min='0' step='0.01' className={fieldClass} value={form.accountantAmount} onChange={e => update('accountantAmount', e.target.value)} /></Field>}
        </div>
        <p className='my-4 text-sm text-slate-600'>{isEmployee ? 'Informe a parcela do contador nas duas quinzenas. A referência de 40% não define o valor oficial. Na segunda, evite repetir descontos já incluídos pelo contador.' : 'A parcela, as faltas e o DSR são calculados pelo servidor conforme cadastro e regras.'} Registre faltas em Ocorrências. O bônus é aplicado na segunda quinzena.</p>
        {!isEmployee && selectedPerson && <fieldset disabled={!!closed || busy !== null} className='grid gap-3 sm:grid-cols-3'>
          {(['positiveMinutes', 'negativeMinutes', 'nightMinutes'] as const).map((key, index) => <Field key={key} label={['Minutos positivos', 'Minutos negativos', 'Minutos noturnos'][index]}><input type='number' min='0' step='1' className={fieldClass} value={form[key]} onChange={e => update(key, e.target.value)} /></Field>)}
          <p className='sm:col-span-3 text-sm'>Horas exigem carga mensal e os três multiplicadores configurados. O servidor valida essa condição.</p>
        </fieldset>}

        {selectedPerson && isSecond && <div className='mt-5'>
          <h3 className='mb-3 text-sm font-bold text-slate-700'>Vales ativos cadastrados (a prévia determina aplicação)</h3>
          <div className='grid gap-2 sm:grid-cols-2'>{applicableVouchers.length === 0 ? <p className='text-sm text-slate-500'>Nenhum vale aplicável.</p> : applicableVouchers.map((voucher) => { const excluded = excludedVouchers.includes(voucher.id); return <label key={voucher.id} className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${excluded ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><span><span className='block text-sm font-bold'>{voucher.description ?? 'Vale'}</span><span className='text-xs'>{brl(voucher.installmentValue)}</span></span><span className='flex items-center gap-2 text-xs'><input disabled={!!closed || busy !== null} type='checkbox' checked={!excluded} onChange={() => { setExcludedVouchers((current) => excluded ? current.filter((id) => id !== voucher.id) : [...current, voucher.id]); invalidate(); }} />Aplicar</span></label>; })}</div>
        </div>}

        {allowsVariableItems && <div className='mt-5 grid gap-4 lg:grid-cols-2'><AdjustmentEditor disabled={!!closed || busy !== null} title='Adicionais manuais' rows={additions} onChange={(rows) => { setAdditions(rows); invalidate(); }} /><AdjustmentEditor disabled={!!closed || busy !== null} title='Descontos manuais' rows={deductions} onChange={(rows) => { setDeductions(rows); invalidate(); }} /></div>}
        <div className='mt-5 flex flex-wrap justify-end gap-2'>{!closed && <><Button type='button' disabled={!selectedPerson || busy !== null || contextLoading || contextError} onClick={() => void savePreparation(false)}>Salvar em aberto</Button><Button type='button' disabled={!selectedPerson || busy !== null || contextLoading || contextError} onClick={() => void savePreparation(true)}>Enviar à conferência</Button></>}<Button type='submit' icon={FileText} isLoading={busy === 'preview'} disabled={!selectedPerson || busy !== null || contextLoading || contextError}>Gerar prévia</Button></div>
      </section>

      <section className={`${panelClass} h-fit p-4 sm:p-5 xl:sticky xl:top-0`}>
        <h2 className='mb-4 font-bold text-slate-800'>Demonstrativo</h2>
        {!preview ? <Empty text='Preencha os dados e gere uma prévia. A confirmação será liberada após a resposta da API.' /> : <><Breakdown calculation={preview} /><div className='mt-4 flex justify-end'><Button type='button' icon={Check} isLoading={busy === 'confirm'} disabled={!preview || !!closed || busy !== null || contextLoading || contextError} onClick={confirm}>Fechar quinzena</Button></div></>}
      </section>
    </form>
  );
}

function VouchersTab({ people, vouchers, loading, onChanged, onReload }: { people: PaymentPerson[]; vouchers: Voucher[]; loading: boolean; onChanged: () => void; onReload: () => Promise<void> }) {
  const now = new Date();
  const [form, setForm] = useState({ paymentPersonId: '', description: '', totalValue: '', installmentValue: '', date: today(), periodicity: '1', intervalMonths: '1', installmentCount: '', startYear: String(now.getFullYear()), startMonth: String(now.getMonth() + 1), competences: '' });
  const [saving, setSaving] = useState(false); const voucherLock = useRef(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (voucherLock.current) return; voucherLock.current = true; setSaving(true);
    try {
      const competences = form.periodicity === '5' ? form.competences.split(',').map((item) => item.trim()).filter(Boolean).map((item) => { const [year, month] = item.split('-').map(Number); return { year, month, skip: false }; }) : [];
      if (form.periodicity === '5' && (competences.length === 0 || competences.some((item) => !Number.isInteger(item.year) || item.year < 2000 || item.year > 9999 || !Number.isInteger(item.month) || item.month < 1 || item.month > 12) || new Set(competences.map(x => x.year + '-' + x.month)).size !== competences.length)) throw new Error('invalid-competences');
      if (!Number.isFinite(parseDecimal(form.installmentValue)) || parseDecimal(form.installmentValue) <= 0) throw new Error('invalid-installment-value');
      if (form.totalValue && (!Number.isFinite(parseDecimal(form.totalValue)) || parseDecimal(form.totalValue) < parseDecimal(form.installmentValue))) throw new Error('invalid-total-value');
      if (form.installmentCount && (!Number.isInteger(Number(form.installmentCount)) || Number(form.installmentCount) <= 0)) throw new Error('invalid-installment-count');
      await postForm('/api/payments/vouchers', makeFormData({ PaymentPersonId: form.paymentPersonId, Description: form.description, TotalValue: form.totalValue || undefined, InstallmentValue: form.installmentValue, Date: form.date, StartYear: form.startYear, StartMonth: form.startMonth, Periodicity: form.periodicity, IntervalMonths: form.intervalMonths, InstallmentCount: form.installmentCount || undefined, CompetencesJson: form.periodicity === '5' ? JSON.stringify(competences) : undefined }));
      alert('Vale cadastrado com sucesso.'); setForm({ ...form, description: '', totalValue: '', installmentValue: '', installmentCount: '' }); onChanged();
    } catch (error) {
      const validationMessages: Record<string, string> = { 'invalid-competences': 'Informe as competências no formato AAAA-MM.', 'invalid-installment-value': 'Informe um valor de parcela maior que zero.', 'invalid-total-value': 'Informe um valor total maior que zero ou deixe o campo vazio.', 'invalid-installment-count': 'Informe uma quantidade de parcelas válida ou deixe o campo vazio.' };
      alert(error instanceof Error && validationMessages[error.message] ? validationMessages[error.message] : getApiErrorMessage(error));
    } finally { voucherLock.current = false; setSaving(false); }
  };
  const changeStatus = async (voucher: Voucher, status: number) => { if (voucherLock.current) return; voucherLock.current = true; setSaving(true); try { await patchForm(`/api/payments/vouchers/${voucher.id}/status`, makeFormData({ Status: status })); alert('Status do vale atualizado com sucesso.'); onChanged(); } catch (error) { alert(getApiErrorMessage(error)); } finally { voucherLock.current = false; setSaving(false); } };
  const periodicity: Record<number, string> = { 1: 'Mensal', 2: 'Alternado', 3: 'A cada X meses', 4: 'Parcela única', 5: 'Personalizado' };
  const statuses: Record<number, string> = { 1: 'Ativo', 2: 'Quitado', 3: 'Pausado', 4: 'Cancelado' };
  return <div className='space-y-5'><form onSubmit={submit} className={`${panelClass} p-5`}><h2 className='mb-4 font-bold'>Cadastrar vale</h2><div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'><Field label='Pessoa'><select required disabled={loading} className={fieldClass} value={form.paymentPersonId} onChange={(e) => setForm({ ...form, paymentPersonId: e.target.value })}><option value=''>Selecione</option>{people.filter(person => person.isActive).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field><Field label='Descrição'><input maxLength={200} required className={fieldClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><Field label='Valor total (opcional)'><input type='text' inputMode='decimal' className={fieldClass} placeholder='0,00' value={form.totalValue} onChange={(e) => setForm({ ...form, totalValue: e.target.value })} /></Field><Field label='Valor da parcela'><input required type='text' inputMode='decimal' className={fieldClass} placeholder='0,00' value={form.installmentValue} onChange={(e) => setForm({ ...form, installmentValue: e.target.value })} /></Field><Field label='Data do vale'><input required type='date' className={fieldClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field><Field label='Periodicidade'><select className={fieldClass} value={form.periodicity} onChange={(e) => setForm({ ...form, periodicity: e.target.value })}>{Object.entries(periodicity).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field><Field label='Quantidade de parcelas (opcional)'><input type='number' min='1' className={fieldClass} value={form.installmentCount} onChange={(e) => setForm({ ...form, installmentCount: e.target.value })} /></Field><Field label='Intervalo em meses'><input required type='number' min='1' className={fieldClass} value={form.intervalMonths} onChange={(e) => setForm({ ...form, intervalMonths: e.target.value })} /></Field><Field label='Ano inicial'><input required type='number' min='2000' max='9999' className={fieldClass} value={form.startYear} onChange={(e) => setForm({ ...form, startYear: e.target.value })} /></Field><Field label='Mês inicial'><input required type='number' min='1' max='12' className={fieldClass} value={form.startMonth} onChange={(e) => setForm({ ...form, startMonth: e.target.value })} /></Field>{form.periodicity === '5' && <Field className='sm:col-span-2' label='Competências (AAAA-MM, separadas por vírgula)'><input required className={fieldClass} placeholder='2026-08, 2026-10' value={form.competences} onChange={(e) => setForm({ ...form, competences: e.target.value })} /></Field>}</div><div className='mt-4 flex justify-end'><Button type='submit' icon={Save} isLoading={saving}>Cadastrar vale</Button></div></form>
    <section className={panelClass}><div className='border-b border-slate-200 p-4'><h2 className='font-bold'>Vales cadastrados</h2></div><div className='overflow-x-auto'><table className='w-full min-w-[1050px] text-left text-sm'><thead className='bg-slate-100 text-xs uppercase text-slate-600'><tr><th className='p-3'>Pessoa</th><th className='p-3'>Descrição</th><th className='p-3'>Total</th><th className='p-3'>Parcela</th><th className='p-3'>Saldo</th><th className='p-3'>Periodicidade</th><th className='p-3'>Status</th><th className='p-3 text-right'>Alterar status</th></tr></thead><tbody className='divide-y divide-slate-100'>{loading ? <LoadingRows columns={8} /> : vouchers.length === 0 ? <tr><td colSpan={8}><Empty text='Nenhum vale cadastrado.' /></td></tr> : vouchers.map((voucher) => <tr key={voucher.id}><td className='p-3 font-bold'>{voucher.personName ?? people.find((person) => person.id === (voucher.paymentPersonId))?.name ?? '—'}</td><td className='p-3'>{voucher.description ?? 'Vale'}</td><td className='p-3'>{brl(voucher.totalValue)}</td><td className='p-3'>{brl(voucher.installmentValue)}</td><td className='p-3'>{brl(voucher.remainingBalance)}</td><td className='p-3'>{periodicity[voucher.periodicity ?? 0] ?? '—'}</td><td className='p-3'>{statuses[voucher.status ?? 1] ?? voucher.status}</td><td className='p-3 text-right'><select disabled={saving} aria-label='Alterar status do vale' className={`${fieldClass} inline-block w-36 py-1.5`} value={voucher.status ?? 1} onChange={(e) => void changeStatus(voucher, Number(e.target.value))}>{Object.entries(statuses).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>{voucher.status !== 4 && <div className='mt-2'><AuditedDeleteAction path={'/vouchers/' + voucher.id} label='Excluir vale' subject={voucher.description ?? 'Vale'} explanation='Cancela aplicações futuras. Saldo, parcelas já aplicadas e histórico permanecem; esta ação não devolve parcelas de fechamentos anteriores.' disabled={saving || loading} onBusyChange={setSaving} onRefresh={onReload} /></div>}</td></tr>)}</tbody></table></div></section>
  </div>;
}

function HistoryTab({ people, defaultYear, onChanged }: { people: PaymentPerson[]; defaultYear: number; onChanged: () => void }) {
  const [filters, setFilters] = useState({ personId: '', year: String(defaultYear), month: '', fortnight: '' });
  const [items, setItems] = useState<Calculation[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'payments' | 'bonuses' | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paidEditor, setPaidEditor] = useState<Calculation | null>(null);
  const [paidAt, setPaidAt] = useState('');
  const requestParams = {
    personId: filters.personId || undefined,
    year: filters.year || undefined,
    month: filters.month || undefined,
    fortnight: filters.fortnight || undefined,
  };

  const historyGeneration = useRef(0);
  useEffect(() => { historyGeneration.current++; setItems([]); }, [filters]);
  const search = useCallback(async () => {
    const version = ++historyGeneration.current;
    if (filters.year && (!Number.isInteger(Number(filters.year)) || Number(filters.year) < 2000 || Number(filters.year) > 9999)) return alert('Informe ano entre 2000 e 9999.');
    setLoading(true);
    setHistoryError('');
    try {
      const response = await api.get('/api/payments/calculations', { params: requestParams });
      if (version === historyGeneration.current) setItems(unwrapList<Calculation>(response.data));
    } catch (error) {
      setHistoryError(getApiErrorMessage(error, 'Não foi possível consultar o histórico.'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void search().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const paidLock = useRef(false);
  const [paying, setPaying] = useState(false);
  const markPaid = async () => {
    if (!paidEditor || !paidAt || paidLock.current) return;
    paidLock.current = true; setPaying(true);
    try { await patchForm('/api/payments/calculations/' + paidEditor.id + '/paid', makeFormData({ PaidAt: new Date(paidAt).toISOString() })); setPaidEditor(null); await search().catch(() => {}); }
    catch(error) { alert(getApiErrorMessage(error) + ' O histórico será consultado antes de uma nova tentativa.'); setPaidEditor(null); await search(); }
    finally { paidLock.current = false; setPaying(false); }
  };
  const exportPdf = async (kind: 'payments' | 'bonuses') => {
    setExporting(kind);
    try {
      const competenceSuffix = `${filters.year || 'todos'}-${filters.month || 'todos'}`;
      const fortnightSuffix = filters.fortnight === '1' ? '-1a-quinzena' : filters.fortnight === '2' ? '-2a-quinzena' : '';
      await downloadPaymentPdf(
        kind === 'payments' ? '/api/payments/calculations/export' : '/api/payments/calculations/bonuses/export',
        requestParams,
        `${kind === 'payments' ? 'pagamentos' : 'bonificacoes'}-${competenceSuffix}${fortnightSuffix}.pdf`,
      );
    } catch (error) {
      alert(error instanceof Error && error.message.startsWith('A API não retornou') ? error.message : getApiErrorMessage(error, 'Não foi possível exportar o PDF.'));
    } finally {
      setExporting(null);
    }
  };

  return <div className='space-y-5'>{historyError && <p role='alert' className='text-sm text-red-700'>{historyError}</p>}<p className='text-sm text-slate-600'>Cancelados permanecem para consulta e não entram nos totais ativos nem nos PDFs. Os valores originais são preservados.</p><section className={`${panelClass} p-4`}><div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]'><Field label='Pessoa'><select className={fieldClass} value={filters.personId} onChange={(e) => setFilters({ ...filters, personId: e.target.value })}><option value=''>Todas</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field><Field label='Ano'><input type='number' className={fieldClass} value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} /></Field><Field label='Mês'><select className={fieldClass} value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })}><option value=''>Todos</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></Field><Field label='Quinzena'><select className={fieldClass} value={filters.fortnight} onChange={(e) => setFilters({ ...filters, fortnight: e.target.value })}><option value=''>Todas</option><option value='1'>Primeira</option><option value='2'>Segunda</option></select></Field><Button className='self-end' icon={Search} isLoading={loading} onClick={() => void search().catch(() => {})}>Buscar</Button></div><div className='mt-3 flex flex-wrap justify-end gap-2'><Button variant='outline' icon={Download} isLoading={exporting === 'payments'} disabled={exporting !== null} onClick={() => void exportPdf('payments')}>Exportar pagamentos em PDF</Button><Button variant='outline' icon={Download} isLoading={exporting === 'bonuses'} disabled={exporting !== null} onClick={() => void exportPdf('bonuses')}>Exportar bonificações em PDF</Button></div></section><section className={panelClass}><div className='overflow-x-auto'><table className='w-full min-w-[1100px] text-left text-sm'><thead className='bg-slate-100 text-xs uppercase text-slate-600'><tr><th className='p-3'>Pessoa</th><th className='p-3'>Competência</th><th className='p-3'>Quinzena</th><th className='p-3'>Valor-base</th><th className='p-3'>1ª quinzena</th><th className='p-3'>2ª quinzena</th><th className='p-3'>Total mensal</th><th className='p-3'>Status</th><th className='p-3'>Cálculo / pagamento</th><th className='p-3 text-right'>Ações</th></tr></thead><tbody className='divide-y divide-slate-100'>{loading ? <LoadingRows columns={10} /> : items.length === 0 ? <tr><td colSpan={10}><Empty text='Nenhum cálculo encontrado para os filtros.' /></td></tr> : items.map((item, index) => { const id = item.id ?? String(index); return <HistoryRow key={id} item={item} disabled={paying || loading || !!historyError} onRefresh={async () => { await search(); onChanged(); }} expanded={expanded === id} onExpand={() => setExpanded(expanded === id ? null : id)} onPaid={() => { setPaidEditor(item); setPaidAt(''); }} />; })}</tbody></table></div></section>{paidEditor && <Modal title='Registrar pagamento do fechamento' onClose={() => { if (!paying) setPaidEditor(null); }}><Field label='Data e hora do pagamento'><input type='datetime-local' className={fieldClass} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></Field><div className='mt-5 flex justify-end gap-2'><Button disabled={paying} variant='outline' onClick={() => setPaidEditor(null)}>Cancelar</Button><Button icon={Check} disabled={paying || !paidAt} onClick={() => void markPaid()}>Confirmar pagamento</Button></div></Modal>}</div>;
}

function HistoryRow({ item, expanded, onExpand, onPaid, onRefresh, disabled }: { item: Calculation; expanded: boolean; onExpand: () => void; onPaid: () => void; onRefresh: () => Promise<void>; disabled: boolean }) {
  const [snapshot, setSnapshot] = useState<Calculation | null>(null);
  const [snapshotError, setSnapshotError] = useState('');
  useEffect(() => {
    // Preview identifies a period, not a calculation ID: it must never be used for a cancelled row.
    if (!expanded || item.status === 4) return;
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) { setSnapshot(null); setSnapshotError(''); } });
    api.post('/api/payments/calculations/preview', makeFormData({ PaymentPersonId: item.paymentPersonId, CompetenceYear: item.competenceYear, CompetenceMonth: item.competenceMonth, Fortnight: item.fortnight }), { signal: controller.signal }).then(response => { if (!controller.signal.aborted) setSnapshot(response.data); }).catch(error => { if (!controller.signal.aborted) setSnapshotError(getApiErrorMessage(error)); });
    return () => controller.abort();
  }, [expanded, item.status, item.paymentPersonId, item.competenceYear, item.competenceMonth, item.fortnight]);
  const paid = !!item.paidAt || item.status === 3;
  const cancelled = item.status === 4;
  const statusLabel: Record<number, string> = { 1: 'Em aberto', 2: 'Fechada', 3: 'Paga', 4: 'Cancelada', 5: 'Em conferência' };
  const checkCancellation = async () => {
    const [history, adjustments] = await Promise.all([
      payments.get<History[]>('/calculations', { personId: item.paymentPersonId, year: item.competenceYear, month: item.competenceMonth }),
      payments.get<unknown[]>('/calculations/' + item.id + '/adjustments'),
    ]);
    const current = history.find(row => row.id === item.id);
    if (!current) return 'Apuração não localizada. Atualize e reconfira o histórico.';
    return calculationCancellationBlock(current, history, adjustments.length > 0);
  };
  return <>
    <tr className={cancelled ? 'bg-slate-50 text-slate-600' : ''}>
      <td className='p-3 font-bold'>{item.personName}<small className='block break-all font-normal'>ID: {item.id}<br />Pessoa: {item.paymentPersonId}</small></td>
      <td className='p-3'>{monthLabel(item.competenceYear, item.competenceMonth)}</td><td className='p-3'>{item.fortnight}ª</td>
      <td className='p-3'>{brl(item.baseValue)}</td><td className='p-3'>{brl(item.firstFortnightValue)}</td><td className='p-3'>{brl(item.secondFortnightValue)}</td><td className='p-3 font-bold'>{brl(item.monthlyTotalValue)}{cancelled && <small className='block font-normal'>Original cancelado · fora dos totais ativos</small>}</td>
      <td className='p-3'>{statusLabel[Number(item.status)] ?? item.status}</td><td className='p-3 text-xs'>{dateTimeBR(item.calculatedAt)}<br />{dateTimeBR(item.paidAt)}</td>
      <td className='p-3'><div className='flex flex-wrap justify-end gap-2'>
        <button type='button' onClick={onExpand} aria-label='Ver demonstrativo' className='rounded p-2 text-slate-600 hover:bg-slate-100'><FileText size={17} /></button>
        {!paid && item.status === 2 && <><button type='button' disabled={disabled} onClick={onPaid} className='rounded p-2 text-emerald-600 hover:bg-emerald-50' aria-label='Marcar como pago'><Check size={17} /></button><AuditedDeleteAction path={'/calculations/' + item.id} label='Cancelar apuração' subject={item.personName + ' — ' + item.fortnight + 'ª quinzena'} explanation='Cancela somente a apuração não paga e sem ajustes, preservando valor e rubricas. O servidor reverte uma única vez as parcelas de vales e as cobranças DSR e devolve a preparação a Em aberto. Para cancelar a primeira, cancele antes a segunda ativa. Um novo fechamento terá outro ID.' disabled={disabled} beforeDelete={checkCancellation} onRefresh={onRefresh} /></>}
        {paid && <small>Pagamento preservado. Correções por ajuste.</small>}
      </div></td>
    </tr>
    {expanded && <tr><td colSpan={10} className='bg-slate-50 p-4'>{cancelled ? <><p className='mb-3 text-sm'>Apuração cancelada: rubricas originais do histórico. Não representa uma nova prévia.</p><Breakdown calculation={item} /></> : snapshot ? <Breakdown calculation={snapshot} /> : <p role='status'>{snapshotError || 'Carregando memória salva…'}</p>}</td></tr>}
  </>;
}

function RulesTab() { const rulesLock = useRef(false);
  const [rules, setRules] = useState<PaymentRule[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [form, setForm] = useState({ effectiveFrom: today(), employeeFirstFortnightPercent: '40', contractorFirstFortnightPercent: '50', fullAbsenceValue: '100', halfAbsenceValue: '50', monthlyWorkMinutes: '', positiveHourMultiplier: '', negativeHourMultiplier: '', nightHourMultiplier: '', contractorAbsenceDailyValue: '', contractorDsrValue: '', halfAbsenceGeneratesDsr: false });
  const load = useCallback(async () => { setLoading(true); try { const response = await api.get('/api/payments/rules'); setRules(unwrapList<PaymentRule>(response.data)); } catch (error) { alert(getApiErrorMessage(error, 'Não foi possível carregar as regras.')); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (rulesLock.current) return; rulesLock.current = true; setSaving(true); try { await postForm('/api/payments/rules', makeFormData({ EffectiveFrom: form.effectiveFrom, EmployeeFirstFortnightPercent: form.employeeFirstFortnightPercent, ContractorFirstFortnightPercent: form.contractorFirstFortnightPercent, FullAbsenceValue: form.fullAbsenceValue, HalfAbsenceValue: form.halfAbsenceValue, MonthlyWorkMinutes: form.monthlyWorkMinutes || undefined, PositiveHourMultiplier: form.positiveHourMultiplier || undefined, NegativeHourMultiplier: form.negativeHourMultiplier || undefined, NightHourMultiplier: form.nightHourMultiplier || undefined, ContractorAbsenceDailyValue: form.contractorAbsenceDailyValue || undefined, ContractorDsrValue: form.contractorDsrValue || undefined, HalfAbsenceGeneratesDsr: form.halfAbsenceGeneratesDsr })); alert('Nova vigência de regras cadastrada com sucesso.'); await load(); } catch (error) { alert(getApiErrorMessage(error)); } finally { rulesLock.current = false; setSaving(false); } };
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <div className='space-y-5'>
    <form onSubmit={submit} className={`${panelClass} p-5`}>
      <div className='mb-4'><h2 className='font-bold'>Nova vigência de regras</h2><p className='text-sm text-slate-500'>Registros anteriores permanecem para consulta. Diária e DSR exigem decisão empresarial explícita. Estas regras não comprovam a configuração histórica de um fechamento.</p></div>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <Field label='Diária contratual (vazio desativa)'><input type='number' min='0.01' step='0.01' className={fieldClass} value={form.contractorAbsenceDailyValue} onChange={e => update('contractorAbsenceDailyValue', e.target.value)} /></Field><Field label='DSR fixo semanal (vazio desativa)'><input type='number' min='0.01' step='0.01' className={fieldClass} value={form.contractorDsrValue} onChange={e => update('contractorDsrValue', e.target.value)} /></Field><label><input type='checkbox' checked={form.halfAbsenceGeneratesDsr} onChange={e => setForm({ ...form, halfAbsenceGeneratesDsr: e.target.checked })} /> Meia falta elegível a DSR (decisão empresarial)</label>
        <Field label='Início da vigência'><input required type='date' className={fieldClass} value={form.effectiveFrom} onChange={(e) => update('effectiveFrom', e.target.value)} /></Field>
        <Field label='% funcionário — 1ª quinzena'><input required readOnly type='text' inputMode='decimal' className={fieldClass} value={form.employeeFirstFortnightPercent} onChange={(e) => update('employeeFirstFortnightPercent', e.target.value)} /></Field>
        <Field label='% prestador — 1ª quinzena'><input required readOnly type='text' inputMode='decimal' className={fieldClass} value={form.contractorFirstFortnightPercent} onChange={(e) => update('contractorFirstFortnightPercent', e.target.value)} /></Field>
        <Field label='Redução do bônus por falta inteira'><input required type='text' inputMode='decimal' className={fieldClass} value={form.fullAbsenceValue} onChange={(e) => update('fullAbsenceValue', e.target.value)} /></Field>
        <Field label='Redução do bônus por meia falta'><input required type='text' inputMode='decimal' className={fieldClass} value={form.halfAbsenceValue} onChange={(e) => update('halfAbsenceValue', e.target.value)} /></Field>
        <Field label='Minutos de trabalho/mês (opcional)'><input type='number' min='1' className={fieldClass} value={form.monthlyWorkMinutes} onChange={(e) => update('monthlyWorkMinutes', e.target.value)} /></Field>
        <Field label='Multiplicador hora positiva (opcional)'><input type='text' inputMode='decimal' className={fieldClass} value={form.positiveHourMultiplier} onChange={(e) => update('positiveHourMultiplier', e.target.value)} /></Field>
        <Field label='Multiplicador hora negativa (opcional)'><input type='text' inputMode='decimal' className={fieldClass} value={form.negativeHourMultiplier} onChange={(e) => update('negativeHourMultiplier', e.target.value)} /></Field>
        <Field label='Multiplicador hora noturna (opcional)'><input type='text' inputMode='decimal' className={fieldClass} value={form.nightHourMultiplier} onChange={(e) => update('nightHourMultiplier', e.target.value)} /></Field>
      </div>
      <div className='mt-4 flex justify-end'><Button type='submit' icon={Save} isLoading={saving}>Criar vigência</Button></div>
    </form>
    <section className={panelClass}><div className='border-b border-slate-200 p-4'><h2 className='font-bold'>Histórico de vigências</h2></div><div className='overflow-x-auto'><table className='w-full min-w-[1050px] text-left text-sm'><thead className='bg-slate-100 text-xs uppercase text-slate-600'><tr><th className='p-3'>Vigência</th><th className='p-3'>Funcionário 1ª</th><th className='p-3'>Prestador 1ª</th><th className='p-3'>Falta</th><th className='p-3'>Meia falta</th><th className='p-3'>Minutos/mês</th><th className='p-3'>Mult. positiva</th><th className='p-3'>Mult. negativa</th><th className='p-3'>Mult. noturna</th><th className='p-3'>Diária / DSR fixo / meia elegível</th></tr></thead><tbody className='divide-y divide-slate-100'>{loading ? <LoadingRows columns={9} /> : rules.length === 0 ? <tr><td colSpan={9}><Empty text='Nenhuma regra cadastrada.' /></td></tr> : rules.map((rule, index) => <tr key={rule.id ?? index}><td className='p-3 font-bold'>{dateBR(rule.effectiveFrom)}</td><td className='p-3'>{rule.employeeFirstFortnightPercent}%</td><td className='p-3'>{rule.contractorFirstFortnightPercent}%</td><td className='p-3'>{brl(rule.fullAbsenceValue)}</td><td className='p-3'>{brl(rule.halfAbsenceValue)}</td><td className='p-3'>{rule.monthlyWorkMinutes ?? '—'}</td><td className='p-3'>{rule.positiveHourMultiplier ?? '—'}</td><td className='p-3'>{rule.negativeHourMultiplier ?? '—'}</td><td className='p-3'>{rule.nightHourMultiplier ?? '—'}</td><td className='p-3'>{rule.contractorAbsenceDailyValue == null ? 'Desativada' : brl(rule.contractorAbsenceDailyValue)} / {rule.contractorDsrValue == null ? 'Desativado' : brl(rule.contractorDsrValue)} / {rule.halfAbsenceGeneratesDsr ? 'Sim' : 'Não'}</td></tr>)}</tbody></table></div></section>
  </div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const headingId = useId(); const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement; dialog.current?.focus(); return () => previous?.focus(); }, []);
  return <div className='fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3' onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div ref={dialog} role='dialog' aria-modal='true' aria-labelledby={headingId} tabIndex={-1} onKeyDown={event => {
    if (event.key === 'Escape') onClose();
    if (event.key !== 'Tab') return;
    const targets = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)') ?? []);
    const first = targets[0]; const last = targets[targets.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} className='max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl'><div className='flex items-center justify-between border-b border-slate-200 p-4'><h3 id={headingId} className='font-bold text-slate-800'>{title}</h3><button onClick={onClose} className='rounded p-1 text-slate-500 hover:bg-slate-100' aria-label='Fechar'><X /></button></div><div className='p-5'>{children}</div></div></div>;
}
