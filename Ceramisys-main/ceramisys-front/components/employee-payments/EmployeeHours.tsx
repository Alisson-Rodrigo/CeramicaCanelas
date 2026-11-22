'use client';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmployeePeriod, EmployeeTimeEntry, employeePayments as service, employeeTimeRequest } from '@/lib/employee-payments';
import { useEmployeeMutation, useEmployeeQuery } from './hooks';
import { ConfirmAction, dateLabel, Empty, Field, input, Notice, Section } from './ui';
export function formatEmployeeMinutes(value: number) { const magnitude = Math.abs(value); return (value < 0 ? '-' : '+') + String(Math.floor(magnitude / 60)).padStart(2,'0') + ':' + String(magnitude % 60).padStart(2,'0'); }
export function EmployeeHours({ scope, version, onChanged }: { scope: EmployeePeriod; version: number; onChanged: () => void }) {
  const key = JSON.stringify(scope) + ':' + version;
  const query = useEmployeeQuery('hours:' + key, signal => service.hours(scope, signal));
  const history = useEmployeeQuery('hours-history:' + key, signal => service.history({ personId: scope.personId, year: scope.year, month: scope.month }, signal));
  const op = useEmployeeMutation(onChanged);
  const [editing, setEditing] = useState<EmployeeTimeEntry | null>(null);
  const blank = { date: scope.year + '-' + String(scope.month).padStart(2,'0') + '-01', positive: '', negative: '', notes: '', correction: false };
  const [form, setForm] = useState(blank);
  const closed = (date: string) => history.data?.some(h => h.status !== 4 && h.fortnight === (Number(date.slice(-2)) <= 15 ? 1 : 2) && h.competenceYear === Number(date.slice(0,4)) && h.competenceMonth === Number(date.slice(5,7)));
  const submit = (e: FormEvent) => { e.preventDefault(); void op.run(async () => {
    if (Number(form.date.slice(0,4)) !== scope.year || Number(form.date.slice(5,7)) !== scope.month) throw new Error('A data deve pertencer à competência selecionada.');
    if (query.data?.occurrences.some(row => row.id !== editing?.id && row.date === form.date)) throw new Error('Já existe registro nesta data, inclusive se cancelado. Edite o registro existente.');
    if ((closed(form.date) || (editing && closed(editing.date))) && !form.correction) throw new Error('Autorize a correção do período fechado e informe o motivo.');
    const body = employeeTimeRequest({ date: form.date, positiveMinutes: Number(form.positive || 0), negativeMinutes: Number(form.negative || 0), notes: form.notes, isCancelled: editing?.isCancelled ?? false, revision: editing?.revision ?? 0, correctClosedPeriod: form.correction });
    if (editing) await service.updateHours(scope.personId, editing.id, body); else await service.createHours(scope.personId, body);
    setEditing(null); setForm(blank);
  }, 'Horas registradas. Nenhum valor monetário foi calculado.'); };
  return <div className='space-y-5'><Notice error={op.error} message={op.message} />
    <Section title='Controle de horas do mês'><Notice error={query.error} loading={query.loading} />{query.data && <dl className='grid grid-cols-3 gap-4 text-sm'><div><dt>Minutos positivos</dt><dd>{query.data.positiveMinutes} ({formatEmployeeMinutes(query.data.positiveMinutes)})</dd></div><div><dt>Minutos negativos</dt><dd>{query.data.negativeMinutes} ({formatEmployeeMinutes(-query.data.negativeMinutes)})</dd></div><div><dt>Saldo informado pela API</dt><dd>{formatEmployeeMinutes(query.data.balanceMinutes)}</dd></div></dl>}<p className='text-sm text-slate-600'>Controle operacional, sem conversão em dinheiro ou desconto salarial.</p></Section>
    <Section title={editing ? 'Editar horas do dia' : 'Registrar horas do dia'}><Notice error={history.error} loading={history.loading} /><form onSubmit={submit} className='space-y-4'><fieldset disabled={op.busy || query.loading || history.loading || !!history.error || !!query.error} className='grid gap-4 sm:grid-cols-2'>
      <Field label='Data das horas'><input type='date' required className={input} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
      <Field label='Minutos positivos'><input type='number' min='0' step='1' inputMode='numeric' className={input} value={form.positive} onChange={e => setForm({ ...form, positive: e.target.value })} /></Field>
      <Field label='Minutos negativos (sem sinal)'><input type='number' min='0' step='1' inputMode='numeric' className={input} value={form.negative} onChange={e => setForm({ ...form, negative: e.target.value })} /></Field>
      <Field label={form.correction ? 'Motivo obrigatório da correção' : 'Observações internas de horas'}><textarea maxLength={2000} required={form.correction} className={input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
      <label className='flex items-start gap-2 text-sm'><input type='checkbox' checked={form.correction} onChange={e => setForm({ ...form, correction: e.target.checked })} />Autorizo registro/correção em período fechado, sem alterar snapshots anteriores.</label>
    </fieldset><div className='flex gap-2'><Button type='submit' disabled={op.busy || query.loading || history.loading || !!history.error || !!query.error}>Salvar horas</Button>{editing && <Button type='button' variant='outline' onClick={() => { setEditing(null); setForm(blank); }}>Cancelar edição</Button>}</div>{editing && <p className='text-sm'>Revisão em edição: {editing.revision}. Em conflito, selecione novamente o registro atualizado.</p>}</form></Section>
    <Section title='Registros de horas'><Notice error={query.error} loading={query.loading} />{query.data?.occurrences.length === 0 && <Empty />}{query.data?.occurrences.map(row => <article key={row.id} className='space-y-2 border-t border-slate-200 py-3 text-sm'><h3 className='font-semibold'>{dateLabel(row.date)} — {row.isCancelled ? 'Cancelado' : 'Ativo'}</h3><p>Positivos: {row.positiveMinutes} min. Negativos: {row.negativeMinutes} min. Revisão: {row.revision}. Responsável: {row.recordedBy}.</p><p className='whitespace-pre-wrap'>{row.notes}</p><div className='flex flex-wrap gap-2'><Button size='sm' variant='outline' disabled={op.busy} onClick={() => { setEditing(row); setForm({ date: row.date, positive: String(row.positiveMinutes), negative: String(row.negativeMinutes), notes: row.notes, correction: false }); }}>Editar horas</Button><ConfirmAction label='Cancelar horas' description='Cancela o registro com revisão e motivo, mantendo o histórico e os snapshots.' reason closedCorrection busy={op.busy} error={op.error} disabled={row.isCancelled || history.loading || !!history.error} onConfirm={(reason, correction) => op.run(async () => { if (closed(row.date) && !correction) throw new Error('Autorize a correção do período fechado.'); await service.updateHours(scope.personId, row.id, employeeTimeRequest({ ...row, notes: reason, isCancelled: true, correctClosedPeriod: correction })); }, 'Registro de horas cancelado.')} /></div></article>)}</Section>
  </div>;
}
