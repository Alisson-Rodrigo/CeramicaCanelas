'use client';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmployeeAbsence, EmployeePeriod, employeeDate, employeeDeletion, employeePayments as service, employeeText } from '@/lib/employee-payments';
import { useEmployeeMutation, useEmployeeQuery } from './hooks';
import { ConfirmAction, dateLabel, Empty, Field, input, Notice, Section } from './ui';
export function EmployeeAbsences({ scope, version, onChanged }: { scope: EmployeePeriod; version: number; onChanged: () => void }) {
  const key = JSON.stringify(scope) + ':' + version;
  const query = useEmployeeQuery('absences:' + key, signal => service.absences(scope, signal));
  const history = useEmployeeQuery('absence-history:' + key, signal => service.history({ personId: scope.personId, year: scope.year, month: scope.month }, signal));
  const op = useEmployeeMutation(onChanged);
  const [editing, setEditing] = useState<EmployeeAbsence | null>(null);
  const initial = { date: scope.year + '-' + String(scope.month).padStart(2, '0') + '-01', isHalf: false, observation: '', correctClosedPeriod: false };
  const [form, setForm] = useState(initial); const [notes, setNotes] = useState<Record<string, string>>({});
  const closed = (date: string) => history.data?.some(h => h.status !== 4 && h.fortnight === (Number(date.slice(-2)) <= 15 ? 1 : 2) && h.competenceYear === Number(date.slice(0, 4)) && h.competenceMonth === Number(date.slice(5, 7)));
  const needsCorrection = !!editing && (closed(editing.date) || closed(form.date));
  const submit = (event: FormEvent) => { event.preventDefault(); void op.run(async () => {
    employeeDate(form.date);
    if (Number(form.date.slice(0, 4)) !== scope.year || Number(form.date.slice(5, 7)) !== scope.month) throw new Error('A data deve pertencer à competência selecionada.');
    if (query.data?.some(a => a.id !== editing?.id && a.date === form.date)) throw new Error('Já há uma ocorrência nessa data, inclusive se cancelada. Edite a existente.');
    if (!editing && closed(form.date)) throw new Error('Não é permitido criar uma falta nova em período fechado.');
    if (needsCorrection && !form.correctClosedPeriod) throw new Error('Confirme expressamente a correção do período fechado.');
    const body = { ...form, observation: employeeText(form.observation, 2000, form.correctClosedPeriod), isCancelled: editing?.isCancelled ?? false, revision: editing?.revision ?? 0 };
    if (editing) await service.updateAbsence(scope.personId, editing.id, body); else await service.createAbsence(scope.personId, body);
    setEditing(null); setForm(initial);
  }, 'Ocorrência salva. A conferência anterior foi invalidada.'); };
  return <div className='space-y-5'><Notice error={op.error} message={op.message} />
    <Section title={editing ? 'Corrigir ocorrência' : 'Registrar falta'}>
      <Notice error={history.error} loading={history.loading} />
      <form onSubmit={submit} className='space-y-4'><fieldset disabled={op.busy || query.loading || history.loading || !!history.error} className='grid gap-4 sm:grid-cols-2'>
        <Field label='Data'><input required type='date' className={input} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label='Ocorrência'><select className={input} value={String(form.isHalf)} onChange={e => setForm({ ...form, isHalf: e.target.value === 'true' })}><option value='false'>Falta inteira</option><option value='true'>Meia falta</option></select></Field>
        <Field label={form.correctClosedPeriod ? 'Motivo obrigatório da correção' : 'Observação'}><textarea maxLength={2000} required={form.correctClosedPeriod} className={input} value={form.observation} onChange={e => setForm({ ...form, observation: e.target.value })} /></Field>
        {editing && <label className='flex gap-2 self-center text-sm'><input type='checkbox' checked={form.correctClosedPeriod} onChange={e => setForm({ ...form, correctClosedPeriod: e.target.checked })} />Autorizo correção em período fechado. Valores já fechados não serão recalculados.</label>}
      </fieldset>
      <p className='text-sm text-slate-600'>As faltas são centralizadas e afetam somente a bonificação calculada pela API. Uma observação não representa abono. Correções financeiras de fechamentos exigem ajuste separado.</p>
      {editing?.isCancelled && <p className='text-sm text-amber-800'>Ocorrência cancelada: esta edição preservará o cancelamento.</p>}
      <div className='flex flex-wrap gap-2'><Button type='submit' disabled={op.busy || query.loading || history.loading || !!history.error || (needsCorrection && !form.correctClosedPeriod)}>Salvar ocorrência</Button>{editing && <Button type='button' variant='outline' onClick={() => { setEditing(null); setForm(initial); }}>Cancelar edição</Button>}</div>
      {editing && <p className='text-sm'>Revisão em edição: {editing.revision}. Se houver conflito, selecione a ocorrência atualizada antes de tentar novamente.</p>}
      </form>
    </Section>
    <Section title='Faltas e conferência do mês'><Notice loading={query.loading} error={query.error} />{query.data?.length === 0 && <Empty />}
      {query.data?.map(absence => <article key={absence.id} className='space-y-3 border-t border-slate-200 pt-4'>
        <h3 className='font-semibold'>{dateLabel(absence.date)} — {absence.isHalf ? 'Meia falta' : 'Falta inteira'} — {absence.isCancelled ? 'Cancelada' : 'Ativa'}</h3>
        <p className='whitespace-pre-wrap text-sm'>{absence.observation || 'Sem observação.'}</p><p className='text-sm text-slate-600'>{absence.fortnight}ª quinzena · Registrada por {absence.recordedBy} · Revisão {absence.revision}</p>
        <p className='text-sm'>{absence.employeeReview?.isReviewed ? 'Conferida em ' + dateLabel(absence.employeeReview.reviewedAt) + ' por ' + absence.employeeReview.reviewedBy : 'Conferência pendente'}</p>
        <div className='flex flex-wrap gap-2'><Button size='sm' disabled={op.busy} onClick={() => { setEditing(absence); setForm({ date: absence.date, isHalf: absence.isHalf, observation: absence.observation, correctClosedPeriod: false }); }}>Editar ocorrência</Button>
          <ConfirmAction error={op.error} label='Cancelar ocorrência' reason closedCorrection disabled={absence.isCancelled || history.loading || !!history.error} busy={op.busy} description='Preserva o registro e o snapshot financeiro. Para período fechado, autorize a correção e informe o motivo; valores pagos não mudam.' onConfirm={(reason, correction) => op.run(async () => { if (closed(absence.date) && !correction) throw new Error('Confirme a correção do período fechado.'); await service.deleteAbsence(scope.personId, absence.id, employeeDeletion(reason, absence.revision, correction)); }, 'Ocorrência cancelada.')} />
        </div>
        {!absence.isCancelled && <div className='flex flex-wrap items-end gap-2'><Field label='Nota da conferência (opcional)'><input maxLength={2000} className={input} value={notes[absence.id] ?? ''} onChange={e => setNotes({ ...notes, [absence.id]: e.target.value })} /></Field><Button size='sm' variant='outline' disabled={op.busy} onClick={() => void op.run(() => service.reviewAbsence(scope.personId, absence.id, { isReviewed: !absence.employeeReview?.isReviewed, revision: absence.revision, notes: employeeText(notes[absence.id] ?? '', 2000, false) }), 'Conferência atualizada.')}>{absence.employeeReview?.isReviewed ? 'Retirar conferência' : 'Conferir falta'}</Button></div>}
      </article>)}
    </Section>
  </div>;
}
