'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmployeeCalculation as Calculation, EmployeePeriod, EmployeePreview, EmployeeHistory, canConfirmEmployee, employeeDeletion, employeeMoney, employeePayments as service, employeeSelections, restoreEmployeeCalculation } from '@/lib/employee-payments';
import { useEmployeeMutation, useEmployeeQuery } from './hooks';
import { Breakdown, ConfirmAction, Field, input, Notice, Section, statusLabel } from './ui';
import { EmployeeVoucherSelection } from './EmployeeEditors';
export function EmployeeCalculation({ scope, version, active, onChanged }: { scope: EmployeePeriod; version: number; active: boolean; onChanged: () => void }) {
  const key = JSON.stringify(scope) + ':' + version;
  const history = useEmployeeQuery('calculation-history:' + key, signal => service.history({ personId: scope.personId, year: scope.year, month: scope.month }, signal));
  const vouchers = useEmployeeQuery('calculation-vouchers:' + key, signal => service.vouchers(scope, signal));
  const preparation = useEmployeeQuery('calculation-preparation:' + key, signal => service.preparation(scope, signal));
  const op = useEmployeeMutation(onChanged); const previewOp = useEmployeeMutation(() => {});
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [accountantAmount, setAmount] = useState(''); const [reference, setReference] = useState(''); const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<{ fingerprint: string; data: EmployeePreview | EmployeeHistory } | null>(null);
  const fingerprint = JSON.stringify({ key, selected, accountantAmount, reference, notes });
  const currentPreview = preview?.fingerprint === fingerprint ? preview.data : null;
  const saved = history.data?.find(row => row.fortnight === scope.fortnight && row.status !== 4);
  const first = history.data?.find(row => row.fortnight === 1 && row.status !== 4);
  const loading = history.loading || vouchers.loading || preparation.loading;
  const unavailable = !!history.error || !!vouchers.error || !!preparation.error;
  const busy = op.busy || previewOp.busy;
  const readOnly = !!saved;
  const base: Calculation = { paymentPersonId: scope.personId, competenceYear: scope.year, competenceMonth: scope.month, fortnight: scope.fortnight, voucherSelections: [] };
  const build = (): Calculation => ({ ...base, voucherSelections: employeeSelections(selected, vouchers.data ?? []), accountantAmount: accountantAmount.trim() ? employeeMoney(accountantAmount) : null, accountantReference: reference, accountantNotes: notes });
  const confirmBlock = readOnly ? 'Período já fechado: memória somente para consulta.' : !active ? 'Funcionário inativo ou excluído: novas apurações indisponíveis.' : scope.fortnight === 2 && first?.status !== 3 ? 'A confirmação da segunda exige a primeira quinzena paga.' : !accountantAmount.trim() ? 'Informe o retorno do contador para confirmar.' : !currentPreview ? 'Gere e confira uma prévia atualizada antes de confirmar.' : null;
  const restore = () => { void previewOp.run(async () => {
    const p = preparation.data; if (!p) return; const c = restoreEmployeeCalculation(p.requestJson);
    if (c.paymentPersonId !== scope.personId || c.competenceYear !== scope.year || c.competenceMonth !== scope.month || c.fortnight !== scope.fortnight) throw new Error('A preparação não pertence à seleção atual.');
    setSelected(Object.fromEntries(c.voucherSelections.map(row => [row.voucherId, String(row.amount)]))); setAmount(c.accountantAmount == null ? '' : String(c.accountantAmount)); setReference(c.accountantReference ?? ''); setNotes(c.accountantNotes ?? '');
  }, 'Preparação retomada. Confira os dados atuais antes de confirmar.'); };
  return <div className='space-y-5'>
    <Notice error={op.error || previewOp.error} message={[op.message, previewOp.message].filter(Boolean).join('\n')} />
    {op.uncertain && <Button variant='outline' disabled={busy} onClick={() => void op.reconcile(() => service.history({ personId: scope.personId, year: scope.year, month: scope.month }))}>Consultar estado antes de repetir</Button>}
    <Section title='Apuração da quinzena'>
      <Notice loading={loading} error={history.error || vouchers.error || preparation.error} />
      {saved && <p className='text-sm font-medium'>Situação: {statusLabel(saved.status)}. A memória será consultada a partir do snapshot salvo.</p>}
      {!saved && <p className='text-sm text-slate-600'>Informe o valor recebido do contador para esta quinzena. O salário cadastrado é informativo. A API descontará somente os vales selecionados; bonificação é um controle separado.</p>}
      {scope.fortnight === 2 && !first && !history.loading && <p className='text-sm text-amber-800'>Feche a primeira quinzena antes de preparar ou prever a segunda.</p>}
      {!saved && <fieldset disabled={busy || loading || unavailable || !active || op.uncertain} className='space-y-5'>
        <EmployeeVoucherSelection vouchers={vouchers.data ?? []} selected={selected} onChange={setSelected} />
        <div className='grid gap-4 sm:grid-cols-2'><Field label='Valor manual recebido do contador'><input required inputMode='decimal' className={input} value={accountantAmount} onChange={e => setAmount(e.target.value)} /></Field><Field label='Referência interna'><input maxLength={150} className={input} value={reference} onChange={e => setReference(e.target.value)} /></Field><Field label='Observações internas'><textarea maxLength={2000} className={input} value={notes} onChange={e => setNotes(e.target.value)} /></Field></div>
      </fieldset>}
      <div className='flex flex-wrap gap-2'>
        <Button disabled={busy || loading || unavailable || op.uncertain || (!saved && (!active || (scope.fortnight === 2 && !first)))} onClick={() => void previewOp.run(async () => { const data = await (saved ?? await service.preview(build())); setPreview({ fingerprint, data }); }, saved ? 'Memória do fechamento carregada.' : 'Prévia carregada; nenhum saldo foi consumido.')}>{saved ? 'Consultar memória salva' : 'Gerar prévia'}</Button>
        {!saved && <><Button variant='outline' disabled={busy || loading || unavailable || !active || op.uncertain} onClick={() => void op.run(() => service.savePreparation(build(), false, preparation.data?.revision ?? 0), 'Preparação salva em aberto.')}>Salvar em aberto</Button><Button variant='outline' disabled={busy || loading || unavailable || !active || op.uncertain} onClick={() => void op.run(() => service.savePreparation(build(), true, preparation.data?.revision ?? 0), 'Preparação salva em conferência.')}>Salvar em conferência</Button></>}
        {!saved && <ConfirmAction error={op.error} label='Confirmar fechamento' description='A API recalculará os dados atuais e consumirá os vales selecionados. Confira o resultado final retornado. Fechar não registra pagamento.' disabled={!!confirmBlock || loading || unavailable || op.uncertain} busy={busy} onConfirm={() => op.run(async () => { const c = build(); const blocked = canConfirmEmployee(c, history.data ?? []); if (blocked) throw new Error(blocked); await service.confirm(c); }, 'Fechamento confirmado. Confira o histórico antes de registrar o pagamento.', true)} />}
      </div>
      {confirmBlock && <p className='text-sm text-slate-600'>{confirmBlock}</p>}
      {preparation.data && <div className='space-y-2 border-t border-slate-200 pt-4'><p className='text-sm'>Preparação: {statusLabel(preparation.data.status)} · Revisão {preparation.data.revision}</p><div className='flex flex-wrap gap-2'><Button size='sm' variant='outline' disabled={busy || readOnly} onClick={restore}>Retomar preparação</Button><ConfirmAction error={op.error} label='Excluir preparação' reason busy={busy} disabled={readOnly || op.uncertain} description='Remove o rascunho e preserva seu conteúdo na auditoria. Não é permitido com fechamento ativo.' onConfirm={reason => op.run(() => service.deletePreparation(preparation.data!.id, employeeDeletion(reason, preparation.data!.revision)), 'Preparação excluída.')} /></div></div>}
    </Section>
    {currentPreview && <Section title={saved ? 'Memória do fechamento' : 'Prévia da API'}><Breakdown value={currentPreview} /></Section>}
  </div>;
}
