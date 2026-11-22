'use client';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { employeePayments as service, employeeVoucherForm, employeeDeletion, EmployeePeriod } from '@/lib/employee-payments';
import { localDate, money } from '@/lib/payments';
import { useEmployeeMutation, useEmployeeQuery } from './hooks';
import { ConfirmAction, dateLabel, Empty, Field, input, Notice, Section, statusLabel } from './ui';
export function EmployeeVouchers({ scope, version, active, onChanged }: { scope: EmployeePeriod; version: number; active: boolean; onChanged: () => void }) {
  const query = useEmployeeQuery('vouchers:' + JSON.stringify(scope) + ':' + version, signal => service.vouchers(scope, signal));
  const op = useEmployeeMutation(onChanged);
  const [form, setForm] = useState({ description: '', value: '', date: localDate(), referenceYear: scope.year, referenceMonth: scope.month });
  const [status, setStatus] = useState<Record<string, string>>({});
  const submit = (e: FormEvent) => { e.preventDefault(); void op.run(async () => { await service.createVoucher(scope.personId, employeeVoucherForm(form)); setForm({ ...form, description: '', value: '' }); }, 'Vale registrado. A lista foi recarregada para consultar o saldo.'); };
  return <div className='space-y-5'><Notice error={op.error} message={op.message} />
    <Section title='Conceder vale'><form onSubmit={submit} className='space-y-4'><fieldset disabled={op.busy || !active} className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      <Field label='Descrição'><input required maxLength={200} className={input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
      <Field label='Valor do vale'><input required inputMode='decimal' className={input} value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></Field>
      <Field label='Data de concessão'><input type='date' required className={input} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
      <Field label='Ano de referência'><input type='number' min={2000} max={9999} required className={input} value={form.referenceYear} onChange={e => setForm({ ...form, referenceYear: Number(e.target.value) })} /></Field>
      <Field label='Mês de referência'><input type='number' min={1} max={12} required className={input} value={form.referenceMonth} onChange={e => setForm({ ...form, referenceMonth: Number(e.target.value) })} /></Field>
    </fieldset><p className='text-sm text-slate-600'>O vale é um crédito finito. O desconto será escolhido na apuração; não há parcelas automáticas.</p><Button type='submit' disabled={op.busy || !active}>Registrar vale</Button></form></Section>
    <Section title='Vales e saldos na competência'><Notice loading={query.loading} error={query.error} />{query.data?.length === 0 && <Empty />}{query.data?.map(voucher => <article key={voucher.id} className='space-y-3 border-t border-slate-200 pt-4'>
      <h3 className='font-semibold'>{voucher.description}</h3><p className='text-sm'>Concedido em {dateLabel(voucher.date)} · Referência {voucher.referenceMonth}/{voucher.referenceYear} · {({ 1: 'Ativo', 2: 'Quitado', 3: 'Pausado', 4: 'Cancelado' }[voucher.status]) ?? voucher.status}</p>
      <dl className='grid grid-cols-2 gap-3 text-sm'><div><dt>Valor concedido</dt><dd>{voucher.totalValue == null ? 'Legado sem valor finito' : money(voucher.totalValue)}</dd></div><div><dt>Descontado</dt><dd>{voucher.deductedValue == null ? 'Não informado' : money(voucher.deductedValue)}</dd></div><div><dt>Saldo atual</dt><dd>{voucher.pendingBalance == null ? 'Indisponível para seleção' : money(voucher.pendingBalance)}</dd></div><div><dt>Fracionamento</dt><dd>Permitido</dd></div></dl>
      <p className='text-sm'>{voucher.availableForDiscount ? 'Disponível para seleção nesta quinzena.' : 'Indisponível para desconto nesta quinzena.'}</p>
      <div className='flex flex-wrap items-end gap-2'><Field label='Nova situação'><select className={input} value={status[voucher.id] ?? String(voucher.status)} onChange={e => setStatus({ ...status, [voucher.id]: e.target.value })} disabled={op.busy}>{[1, 2, 3, 4].map(s => <option key={s} value={s}>{({1:'Ativo',2:'Quitado',3:'Pausado',4:'Cancelado'}[s])}</option>)}</select></Field><ConfirmAction error={op.error} label='Alterar situação' description='Não altera os descontos dos fechamentos anteriores.' busy={op.busy} onConfirm={() => op.run(() => service.voucherStatus(voucher.id, Number(status[voucher.id] ?? voucher.status)), 'Situação do vale atualizada.')} /><ConfirmAction error={op.error} label='Cancelar vale' description='Impede descontos futuros e preserva o histórico. Não estorna fechamentos anteriores.' reason disabled={voucher.status === 4} busy={op.busy} onConfirm={reason => op.run(() => service.deleteVoucher(voucher.id, employeeDeletion(reason)), 'Vale cancelado.')} /></div>
      <details><summary className='cursor-pointer text-sm font-medium'>Histórico de descontos</summary>{voucher.discounts.length === 0 ? <Empty /> : <ul className='space-y-2 py-3 text-sm'>{voucher.discounts.map((discount, i) => <li key={i}>{discount.month}/{discount.year}, {discount.fortnight}ª quinzena: {money(discount.amount)} — {statusLabel(discount.status)}. Fechamento: {discount.calculationId}. Pago em {dateLabel(discount.paidAt)}.</li>)}</ul>}</details>
    </article>)}</Section>
  </div>;
}
