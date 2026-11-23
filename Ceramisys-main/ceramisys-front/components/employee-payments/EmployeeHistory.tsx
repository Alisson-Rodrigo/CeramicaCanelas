'use client';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmployeeHistory as History, EmployeePeriod, employeeCancellationBlock, employeeDeletion, employeeMoney, employeePayments as service, employeeText } from '@/lib/employee-payments';
import { localDate, money } from '@/lib/payments';
import { useEmployeeMutation, useEmployeeQuery } from './hooks';
import { Breakdown, ConfirmAction, dateLabel, Empty, Field, input, Notice, Section, statusLabel } from './ui';
export function EmployeeHistory({ scope, version, onChanged, onSelect }: { scope: EmployeePeriod; version: number; onChanged: () => void; onSelect: (id: string, name: string) => void }) {
  const [both, setBoth] = useState(true); const [selected, setSelected] = useState<History | null>(null);
  const filters = { personId: scope.personId || undefined, year: scope.year, month: scope.month, ...(both ? {} : { fortnight: scope.fortnight }) };
  const query = useEmployeeQuery('history:' + JSON.stringify(filters) + ':' + version, signal => service.history(filters, signal));
  const exportOp = useEmployeeMutation(() => {});
  const download = async () => { await exportOp.run(async () => {
    const file = await service.download('payments', filters); const url = URL.createObjectURL(file.blob); const link = document.createElement('a');
    try { link.href = url; link.download = file.filename; document.body.appendChild(link); link.click(); }
    finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }, 'Download solicitado.'); };
  const selectedRow = query.data?.find(row => row.id === selected?.id) ?? selected;
  return <div className='space-y-5'>
    <Section title='Fechamentos e pagamentos'><div className='flex flex-wrap gap-3'><label className='flex items-center gap-2 text-sm'><input type='checkbox' checked={both} onChange={e => { setBoth(e.target.checked); setSelected(null); }} />Consultar as duas quinzenas do mês</label><Button variant='outline' disabled={exportOp.busy} onClick={() => void download()}>PDF de pagamentos</Button></div><Notice error={query.error || exportOp.error} message={exportOp.message} loading={query.loading} />
      <p className='text-sm text-slate-600'>Os PDFs usam snapshots de funcionários. Ajustes posteriores são exibidos separadamente no resumo mensal. Cancelados permanecem no histórico.</p>
      {query.data?.length === 0 && <Empty />}
      {!!query.data?.length && <div className='overflow-x-auto'><table className='w-full min-w-[750px] text-left text-sm'><thead><tr>{['Funcionário', 'Quinzena', 'Estado', 'Líquido original', 'Pagamento', 'Ações'].map(label => <th className='p-2' key={label}>{label}</th>)}</tr></thead><tbody>{query.data.map(row => <tr key={row.id} className='border-t border-slate-100'><td className='p-2'>{row.personName}</td><td className='p-2'>{row.fortnight}ª</td><td className='p-2'>{statusLabel(row.status)}</td><td className='p-2'>{money(row.netValue)}</td><td className='p-2'>{dateLabel(row.paidAt)}</td><td className='p-2'><div className='flex flex-wrap gap-2'><Button size='sm' onClick={() => setSelected(row)}>Detalhar fechamento</Button><Button size='sm' variant='outline' onClick={() => onSelect(row.paymentPersonId, row.personName)}>Consultar funcionário</Button></div></td></tr>)}</tbody></table></div>}
    </Section>
    {selectedRow && <EmployeeClosing key={selectedRow.id} row={selectedRow} version={version} onChanged={onChanged} />}
  </div>;
}
function EmployeeClosing({ row, version, onChanged }: { row: History; version: number; onChanged: () => void }) {
  const queryKey = row.id + ':' + version;
  const adjustments = useEmployeeQuery('adjustments:' + queryKey, signal => service.adjustments(row.id, signal));
  const history = useEmployeeQuery('cancel-dependencies:' + queryKey, signal => service.history({ personId: row.paymentPersonId, year: row.competenceYear, month: row.competenceMonth }, signal));
  const op = useEmployeeMutation(onChanged);
  const [paidAt, setPaidAt] = useState(localDate() + 'T12:00');
  const [form, setForm] = useState({ reference: '', amount: '', reason: '' });
  const blocked = employeeCancellationBlock(row, history.data ?? [], adjustments.data ?? []);
  const pendingSources = history.loading || adjustments.loading || !!history.error || !!adjustments.error;
  const timestamp = () => { const date = new Date(paidAt); if (!paidAt || Number.isNaN(date.getTime())) throw new Error('Informe data e horário de pagamento válidos.'); return date.toISOString(); };
  const submit = (event: FormEvent) => { event.preventDefault(); void op.run(async () => {
    const amount = employeeMoney(form.amount, -Infinity, true); if (amount === 0) throw new Error('O ajuste deve ser diferente de zero.');
    await service.createAdjustment(row.id, { reference: employeeText(form.reference, 100), amount, reason: employeeText(form.reason, 2000) }); setForm({ reference: '', amount: '', reason: '' });
  }, 'Ajuste registrado separadamente do fechamento original.', true); };
  return <Section title={'Fechamento de ' + row.personName + ' — ' + row.fortnight + 'ª quinzena'}>
    <p className='text-sm'>Situação: {statusLabel(row.status)}. Fechado em {dateLabel(row.calculatedAt)}. Pago em {dateLabel(row.paidAt)}.</p>
    <Notice loading={history.loading || adjustments.loading} error={op.error || history.error || adjustments.error} message={op.message} />
    {op.uncertain && <Button variant='outline' disabled={op.busy} onClick={() => void op.reconcile(() => Promise.all([service.history({ personId: row.paymentPersonId, year: row.competenceYear, month: row.competenceMonth }), service.adjustments(row.id)]))}>Consultar estado antes de repetir</Button>}
    <Breakdown value={row} />
    <Field label='Data e horário para registrar pagamento ou liquidar ajuste'><input type='datetime-local' required className={input + ' max-w-md'} value={paidAt} onChange={e => setPaidAt(e.target.value)} /></Field>
    <div className='flex flex-wrap gap-2'><ConfirmAction error={op.error} label='Registrar pagamento' description='Registra que o fechamento foi pago; não realiza transferência bancária.' busy={op.busy} disabled={row.status !== 2 || !!row.paidAt || op.uncertain || history.loading || !!history.error} onConfirm={() => op.run(() => service.paid(row.id, timestamp()), 'Pagamento registrado.', true)} />
      <ConfirmAction error={op.error} label='Cancelar apuração' reason description='Cancela somente um fechamento não pago e sem ajustes. Os vales consumidos são revertidos pela API e o snapshot é preservado.' disabled={!!blocked || pendingSources || op.uncertain} busy={op.busy} onConfirm={reason => op.run(() => service.cancel(row.id, employeeDeletion(reason)), 'Apuração cancelada. Consulte os saldos e a preparação atualizados.', true)} />
    </div>{blocked && <p className='text-sm text-slate-600'>{blocked}</p>}
    <div className='space-y-4 border-t border-slate-200 pt-4'><h3 className='font-semibold'>Ajustes posteriores</h3><p className='text-sm text-slate-600'>O ajuste não altera o líquido original. Valores positivos complementam e negativos reduzem; a liquidação é independente.</p>
      {adjustments.data?.length === 0 && <Empty>Nenhum ajuste registrado.</Empty>}
      {adjustments.data?.map(adjustment => <article key={adjustment.id} className='space-y-2 border-b border-slate-100 pb-3 text-sm'><p className='font-medium'>{adjustment.reference}: {money(adjustment.amount)}</p><p className='whitespace-pre-wrap'>{adjustment.reason}</p><p>Responsável: {adjustment.userId}. {adjustment.paidAt ? 'Liquidado em ' + dateLabel(adjustment.paidAt) : 'Pendente de liquidação.'}</p><ConfirmAction error={op.error} label='Liquidar ajuste' disabled={!!adjustment.paidAt || op.uncertain} busy={op.busy} description={'Registra uma única liquidação da referência ' + adjustment.reference + '.'} onConfirm={() => op.run(() => service.payAdjustments(row.id, adjustment.reference, timestamp()), 'Ajuste liquidado.', true)} /></article>)}
      <form onSubmit={submit} className='space-y-3'><fieldset disabled={op.busy || op.uncertain || ![2,3].includes(row.status) || pendingSources} className='grid gap-3 sm:grid-cols-2'><Field label='Referência única no fechamento'><input required maxLength={100} className={input} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></Field><Field label='Valor assinado do ajuste'><input required inputMode='decimal' className={input} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></Field><Field label='Motivo do ajuste'><textarea required maxLength={2000} className={input} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></Field></fieldset><Button type='submit' disabled={op.busy || op.uncertain || ![2,3].includes(row.status) || pendingSources}>Registrar ajuste</Button></form>
    </div>
  </Section>;
}
