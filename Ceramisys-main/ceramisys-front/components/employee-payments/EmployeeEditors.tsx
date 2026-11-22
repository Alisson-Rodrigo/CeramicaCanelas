'use client';
import { money } from '@/lib/payments';
import type { EmployeeVoucher } from '@/lib/employee-payments';
import { Field, input } from './ui';
export function EmployeeVoucherSelection({ vouchers, selected, onChange, disabled }: { vouchers: EmployeeVoucher[]; selected: Record<string, string>; onChange: (value: Record<string, string>) => void; disabled?: boolean }) {
  return <fieldset disabled={disabled} className='space-y-3'><legend className='mb-2 font-medium'>Vales a descontar nesta apuração</legend><p className='text-sm text-slate-600'>Nenhum vale é descontado sem seleção. Os saldos só são consumidos ao confirmar o fechamento.</p>{vouchers.length === 0 && <p className='text-sm text-slate-600'>Nenhum vale nesta consulta.</p>}{vouchers.map(voucher => <div key={voucher.id} className='grid gap-2 border-t border-slate-100 py-2 sm:grid-cols-[1fr_150px]'>
    <label className='flex items-start gap-2 text-sm'><input className='mt-1' type='checkbox' disabled={disabled || !voucher.availableForDiscount} checked={Object.hasOwn(selected, voucher.id)} onChange={e => { const next = { ...selected }; if (e.target.checked) next[voucher.id] = String(voucher.pendingBalance ?? ''); else delete next[voucher.id]; onChange(next); }} /><span>{voucher.description}<small className='block text-slate-600'>Saldo: {voucher.pendingBalance == null ? 'indisponível' : money(voucher.pendingBalance)}. Desconto parcial ou integral. {!voucher.availableForDiscount && 'Não disponível nesta quinzena.'}</small></span></label>
    {Object.hasOwn(selected, voucher.id) && <Field label='Valor a descontar'><input inputMode='decimal' className={input} value={selected[voucher.id]} onChange={e => onChange({ ...selected, [voucher.id]: e.target.value })} /></Field>}
  </div>)}</fieldset>;
}
