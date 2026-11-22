'use client';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { employeePayments as service, employeePersonForm, employeeDeletion, EmployeePerson } from '@/lib/employee-payments';
import { money } from '@/lib/payments';
import { useEmployeeMutation } from './hooks';
import { ConfirmAction, dateLabel, Empty, Field, input, Notice, Section } from './ui';
const blank = { name: '', monthlyValue: '', monthlyBonus: '0', admissionDate: '' };
export function EmployeePeople({ people, loading, loadError, onChanged, onSelect }: { people: EmployeePerson[]; loading: boolean; loadError: boolean; onChanged: () => void; onSelect: (id: string, name: string) => void }) {
  const [form, setForm] = useState(blank); const [editing, setEditing] = useState<EmployeePerson | null>(null); const [search, setSearch] = useState('');
  const operation = useEmployeeMutation(onChanged);
  const submit = (event: FormEvent) => { event.preventDefault(); void operation.run(async () => {
    const data = employeePersonForm(form, !editing);
    if (editing) await service.salary(editing.id, data); else await service.createPerson(data);
    setEditing(null); setForm(blank);
  }, 'Cadastro financeiro salvo.'); };
  return <div className='space-y-5'>
    <Notice error={operation.error} message={operation.message} />
    <Section title={editing ? 'Editar valores de ' + editing.name : 'Cadastrar funcionário na folha'}>
      <p className='text-sm text-slate-600'>O salário mensal é informativo e não preenche o valor de pagamento. A alteração de valores não modifica fechamentos anteriores.</p>
      <form onSubmit={submit} className='space-y-4'><fieldset disabled={operation.busy} className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <Field label='Nome'><input required maxLength={150} disabled={!!editing} className={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label='Salário mensal'><input required inputMode='decimal' className={input} value={form.monthlyValue} onChange={e => setForm({ ...form, monthlyValue: e.target.value })} /></Field>
        <Field label='Bonificação mensal'><input inputMode='decimal' className={input} value={form.monthlyBonus} onChange={e => setForm({ ...form, monthlyBonus: e.target.value })} /><small>Zero remove a bonificação. Vazio preserva o valor ao editar.</small></Field>
        <Field label='Admissão (opcional)'><input type='date' className={input} value={form.admissionDate} onChange={e => setForm({ ...form, admissionDate: e.target.value })} />{editing && <small>Vazio preserva a data anterior.</small>}</Field>
      </fieldset>
      {editing && <p className='text-sm text-slate-600'>O nome não é alterável neste cadastro.</p>}
      <div className='flex gap-2'><Button type='submit' disabled={operation.busy}>Salvar cadastro</Button>{editing && <Button type='button' variant='outline' disabled={operation.busy} onClick={() => { setEditing(null); setForm(blank); }}>Cancelar edição</Button>}</div></form>
    </Section>
    <Section title='Funcionários cadastrados'>
      <Field label='Buscar por nome'><input type='search' className={input + ' max-w-md'} value={search} onChange={e => setSearch(e.target.value)} /></Field>
      {!loading && !loadError && people.length === 0 ? <Empty>Nenhum funcionário cadastrado na folha.</Empty> : <div className='overflow-x-auto'><table className='w-full min-w-[820px] text-left text-sm'><thead><tr>{['Nome', 'Situação', 'Salário mensal', 'Bonificação', 'Admissão', 'Ações'].map(label => <th className='p-2' key={label}>{label}</th>)}</tr></thead><tbody>{people.filter(person => person.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).map(person => <tr className='border-t border-slate-100' key={person.id}><td className='p-2'>{person.name}</td><td className='p-2'>{person.isActive ? 'Ativo' : 'Inativo'}</td><td className='p-2'>{money(person.monthlyValue)}</td><td className='p-2'>{money(person.monthlyBonus)}</td><td className='p-2'>{dateLabel(person.admissionDate)}</td><td className='p-2'><div className='flex flex-wrap gap-2'>
        <Button size='sm' onClick={() => onSelect(person.id, person.name)}>Abrir funcionário</Button>
        <Button size='sm' variant='outline' disabled={operation.busy} onClick={() => { setEditing(person); setForm({ ...blank, name: person.name, monthlyValue: String(person.monthlyValue), monthlyBonus: String(person.monthlyBonus), admissionDate: person.admissionDate ?? '' }); }}>Editar valores</Button>
        <ConfirmAction error={operation.error} label={person.isActive ? 'Inativar' : 'Ativar'} description='Altera somente a situação deste cadastro financeiro.' busy={operation.busy} onConfirm={() => operation.run(() => service.status(person.id, !person.isActive), 'Situação atualizada.')} />
        <ConfirmAction error={operation.error} label='Excluir cadastro' reason description='Remove o cadastro da listagem. Fechamentos e histórico são preservados; não há restauração disponível.' busy={operation.busy} onConfirm={reason => operation.run(() => service.deletePerson(person.id, employeeDeletion(reason)), 'Cadastro excluído.')} />
      </div></td></tr>)}</tbody></table></div>}
    </Section>
  </div>;
}
