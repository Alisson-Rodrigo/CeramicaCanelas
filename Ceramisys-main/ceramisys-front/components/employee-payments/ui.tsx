'use client';
import { FormEvent, ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { money, parseStored } from '@/lib/payments';
import type { EmployeeHistory, EmployeePreview } from '@/lib/employee-payments';
export const input = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-orange-700 disabled:cursor-not-allowed disabled:bg-slate-100';
export const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat('pt-BR', value.length === 10 ? {} : { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value.length === 10 ? value + 'T12:00:00' : value)) : 'Não informado';
export const statusLabel = (status: number) => ({ 1: 'Em aberto', 2: 'Fechada', 3: 'Paga', 4: 'Cancelada', 5: 'Em conferência' }[status] ?? 'Não informado');
export function Section({ title, children }: { title: string; children: ReactNode }) { const id = useId(); return <section aria-labelledby={id} className='space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5'><h2 id={id} className='text-lg font-semibold text-slate-800'>{title}</h2>{children}</section>; }
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className='block text-sm font-medium text-slate-700'>{label}{children}</label>; }
export function Notice({ error, message, loading }: { error?: string; message?: string; loading?: boolean }) { return <>{loading && <p role='status' className='py-3 text-sm text-slate-600'>Carregando…</p>}{error && <p role='alert' className='whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800'>{error}</p>}{message && <p role='status' className='whitespace-pre-wrap text-sm text-slate-700'>{message}</p>}</>; }
export function Empty({ children = 'Nenhum registro encontrado.' }: { children?: ReactNode }) { return <p className='py-6 text-sm text-slate-600'>{children}</p>; }
export function Value({ label, value }: { label: string; value: number | null | undefined }) { return <div><dt className='text-sm text-slate-600'>{label}</dt><dd className='mt-1 text-lg font-semibold text-slate-900'>{value == null ? 'Não informado' : money(value)}</dd></div>; }
export function Snapshot({ value }: { value: unknown }) { const data = typeof value === 'string' ? parseStored(value) : value; return <pre className='max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs'>{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre>; }
export function ConfirmAction({ label, description, reason = false, closedCorrection = false, disabled, busy, error, onConfirm }: { label: string; description: string; reason?: boolean; closedCorrection?: boolean; disabled?: boolean; busy?: boolean; error?: string; onConfirm: (reason: string, closed: boolean) => Promise<boolean> }) {
  const [open, setOpen] = useState(false); const [text, setText] = useState(''); const [closed, setClosed] = useState(false); const [confirmed, setConfirmed] = useState(false);
  const ref = useRef<HTMLDialogElement>(null); const titleId = useId();
  useEffect(() => { if (open) ref.current?.showModal(); else ref.current?.close(); }, [open]);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!confirmed || busy || (reason && !text.trim())) return; if (await onConfirm(text, closed)) setOpen(false); };
  return <><Button size='sm' type='button' variant='outline' disabled={disabled || busy} onClick={() => { setText(''); setClosed(false); setConfirmed(false); setOpen(true); }}>{label}</Button><dialog ref={ref} aria-labelledby={titleId} onCancel={e => { if (busy) e.preventDefault(); else setOpen(false); }} onClose={() => setOpen(false)} className='fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-5 shadow-xl backdrop:bg-black/40'>
    <form onSubmit={submit} className='space-y-4'><h3 id={titleId} className='text-lg font-semibold'>{label}</h3><p className='text-sm text-slate-700'>{description}</p>
      {reason && <Field label='Motivo da ação'><textarea required maxLength={2000} className={input} value={text} onChange={e => setText(e.target.value)} disabled={busy} /></Field>}
      {closedCorrection && <label className='flex gap-2 text-sm'><input type='checkbox' checked={closed} onChange={e => setClosed(e.target.checked)} disabled={busy} />Autorizo expressamente a correção em período fechado. O valor original não será recalculado.</label>}
      <label className='flex gap-2 text-sm'><input type='checkbox' required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} />Confirmo esta ação.</label>
      <Notice error={error} /><div className='flex gap-2'><Button type='submit' disabled={busy || !confirmed || (reason && !text.trim())}>{busy ? 'Aguarde…' : 'Confirmar ação'}</Button><Button type='button' variant='outline' disabled={busy} onClick={() => setOpen(false)}>Voltar</Button></div>
    </form>
  </dialog></>;
}
export function Breakdown({ value }: { value: EmployeePreview | EmployeeHistory }) {
  const preview = 'grossValue' in value ? value : null; const settlement = value.employeeSettlement;
  return <div className='space-y-4'>
    {settlement?.isLegacyCalculation && <p className='text-sm text-amber-800'>Fechamento legado: valores e rubricas originais preservados. Não reconstruir o pagamento pelas regras atuais.</p>}
    <dl className='grid grid-cols-2 gap-4 lg:grid-cols-3'><Value label='Valor original informado pelo contador' value={settlement?.accountantProvidedAmount ?? preview?.grossValue} /><Value label='Descontos internos informados pela API' value={settlement?.internalVoucherDeduction ?? preview?.deductionValue} /><Value label='Líquido da quinzena' value={value.netValue} /></dl>
    {settlement && <><p className='text-sm'>Pagamento da primeira: {dateLabel(settlement.firstFortnightPaidAt)}. O valor da primeira não é subtraído novamente da segunda.</p>{settlement.accountantReference && <p className='text-sm'>Referência interna: {settlement.accountantReference}</p>}{settlement.accountantNotes && <p className='whitespace-pre-wrap text-sm'>Observações internas: {settlement.accountantNotes}</p>}</>}
    <p className='text-sm text-slate-600'>Demonstrativo interno do pagamento. A bonificação nova é consultada em relatório separado.</p>
    <div className='overflow-x-auto'><table className='w-full min-w-[500px] text-left text-sm'><thead><tr><th className='p-2'>Rubrica original</th><th className='p-2'>Natureza</th><th className='p-2 text-right'>Valor</th></tr></thead><tbody>{value.items.map((row, index) => <tr key={index} className='border-t border-slate-100'><td className='p-2'>{row.description}</td><td className='p-2'>{row.kind === 2 ? 'Informativa' : row.kind === 12 ? 'Redução de bonificação legada' : [3,4,6,8,10,13].includes(row.kind) ? 'Desconto' : 'Crédito'}</td><td className='p-2 text-right'>{money(row.amount)}</td></tr>)}</tbody></table></div>
  </div>;
}
