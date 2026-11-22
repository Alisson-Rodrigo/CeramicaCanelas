'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { payments, decimal, money, localDate, parseStored, type Absence, type MonthlySummary, type AccountantSummary, type Audit, type DsrCharge, type Adjustment } from '@/lib/payments';
import type { PaymentPerson } from './Payments';
import { getApiErrorMessage } from '@/lib/api-error';
import { Button } from '@/components/ui/Button';
import { AuditedDeleteAction } from '../AuditedDeleteAction';

const input = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm';
const panel = 'space-y-3 rounded-xl border border-slate-200 bg-white p-4';
const emptyAbsence = { date: localDate(), isHalf: false, observation: '', isCancelled: false, correctClosedPeriod: false };
type Sources = { absences?: Absence[]; monthly?: MonthlySummary; accountant?: AccountantSummary; audit?: Audit[]; dsr?: DsrCharge[] };
function SafeText({ value }: { value: string }) { const parsed = parseStored(value); return <pre className='max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs'>{typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)}</pre>; }
export function PaymentWorkspace({ people }: { people: PaymentPerson[] }) {
  const now = new Date(); const [personId, setPersonId] = useState(''); const [year, setYear] = useState(now.getFullYear()); const [month, setMonth] = useState(now.getMonth() + 1);
  const [section, setSection] = useState('absences'); const [data, setData] = useState<Sources>({}); const [errors, setErrors] = useState<Record<string, string>>({});
  const [refresh, setRefresh] = useState(0); const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false); const lock = useRef(false); const version = useRef(0);
  const [message, setMessage] = useState(''); const [editing, setEditing] = useState<Absence | null>(null); const [form, setForm] = useState(emptyAbsence);
  const [adjustment, setAdjustment] = useState({ calculationId: '', reference: '', amount: '', reason: '' });
  const [paidDates, setPaidDates] = useState<Record<string, string>>({});
  const [origins, setOrigins] = useState<Record<string, Absence[]>>({});
  const [historicalPersonId, setHistoricalPersonId] = useState('');
  const person = people.find(p => p.id === personId);
  useEffect(() => {
    const controller = new AbortController(); const current = ++version.current;
    setData({}); setErrors({}); setOrigins({}); setEditing(null); setForm(emptyAbsence); setMessage(''); setAdjustment({ calculationId: '', reference: '', amount: '', reason: '' });
    if (!personId || year < 2000 || year > 9999 || month < 1 || month > 12) { setLoading(false); return; }
    setLoading(true);
    const sources = ['absences', 'monthly-summary', 'audit', 'dsr', ...(person?.employmentType === 1 ? ['accountant-summary'] : [])];
    const keys = { absences: 'absences', 'monthly-summary': 'monthly', audit: 'audit', dsr: 'dsr', 'accountant-summary': 'accountant' } as const;
    Promise.allSettled(sources.map(async source => {
      const result = await payments.get(`/people/${personId}/${source}`, ['audit', 'dsr'].includes(source) ? undefined : { year, month }, controller.signal);
      if (current === version.current) setData(previous => ({ ...previous, [keys[source as keyof typeof keys]]: result }));
    })).then(results => {
      if (current !== version.current) return;
      results.forEach((result, i) => { if (result.status === 'rejected') setErrors(previous => ({ ...previous, [sources[i]]: getApiErrorMessage(result.reason) })); }); setLoading(false);
    });
    return () => { controller.abort(); };
  }, [personId, year, month, refresh, person?.employmentType]);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage('');
    try { await action(); setRefresh(x => x + 1); }
    catch(e) { setMessage(e instanceof Error && !('response' in e) ? e.message : getApiErrorMessage(e)); }
    finally { lock.current = false; setBusy(false); }
  };
  const reloadAbsences = async () => {
    const current = version.current;
    const rows = await payments.get<Absence[]>(`/people/${personId}/absences`, { year, month });
    if (current !== version.current) return;
    setData(previous => ({ ...previous, absences: rows })); setEditing(null); setForm(emptyAbsence);
    setRefresh(value => value + 1);
  };
  const saveAbsence = (event: FormEvent) => {
    event.preventDefault(); void run(async () => {
      if (!editing && data.absences?.some(x => x.date === form.date)) throw new Error('Esta data já possui ocorrência, inclusive cancelada. Edite o registro existente.');
      if (form.correctClosedPeriod && (!editing || !form.observation.trim())) throw new Error('Correção de período fechado exige ocorrência existente e motivo.');
      if (form.correctClosedPeriod && !window.confirm('Confirmar correção da ocorrência? O fechamento original será preservado. Uma diferença financeira deve ser registrada em ajuste separado.')) return;
      const body = { ...form, revision: editing?.revision ?? 0 };
      try {
        if (editing) await payments.put(`/people/${personId}/absences/${editing.id}`, body); else await payments.post(`/people/${personId}/absences`, body);
      } catch (e) {
        // Refresh the version but require the operator to reopen the current record.
        const current = await payments.get<Absence[]>(`/people/${personId}/absences`, { year, month }).catch(() => null);
        if (current) {
          setData(previous => ({ ...previous, absences: current }));
          if (editing && current.some(a => a.id === editing.id && a.revision !== editing.revision)) {
            setEditing(null); setForm(emptyAbsence);
          }
        }
        throw e;
      }
    });
  };
  const addAdjustment = (event: FormEvent) => { event.preventDefault(); void run(async () => {
    const amount = decimal(adjustment.amount, true); if (!amount) throw new Error('Informe um valor diferente de zero.');
    await payments.post(`/calculations/${adjustment.calculationId}/adjustments`, { reference: adjustment.reference.trim(), amount, reason: adjustment.reason.trim() });
  }); };
  const settle = (row: Adjustment) => void run(async () => {
    const date = paidDates[row.id]; if (!date) throw new Error('Informe a data e hora da liquidação.');
    let owner: string | undefined;
    for (const period of data.monthly?.periods ?? []) {
      const rows = await payments.get<Adjustment[]>(`/calculations/${period.id}/adjustments`);
      if (rows.some(x => x.id === row.id)) { owner = period.id; break; }
    }
    if (!owner) throw new Error('Fechamento do ajuste não localizado. Atualize o resumo.');
    try { await payments.patch(`/calculations/${owner}/adjustments/paid`, { reference: row.reference, paidAt: new Date(date).toISOString() }); }
    catch(e) { setRefresh(x => x + 1); throw e; }
  });
  const loadOrigins = async (charge: DsrCharge) => {
    const current = version.current;
    try {
      const monday = new Date(charge.weekStart + 'T12:00:00'); const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
      const months = new Map([monday, sunday].map(date => [`${date.getFullYear()}-${date.getMonth()}`, { year: date.getFullYear(), month: date.getMonth() + 1 }]));
      const rows = (await Promise.all([...months.values()].map(params => payments.get<Absence[]>(`/people/${personId}/absences`, params)))).flat();
      const ids = charge.absenceIds.split(',').map(id => id.trim());
      if (version.current === current) setOrigins(previous => ({ ...previous, [charge.id]: rows.filter(a => ids.includes(a.id)) }));
    } catch (error) { if (version.current === current) setMessage(getApiErrorMessage(error)); }
  };
  const showSection = (id: string) => {
    setSection(id);
    if (id !== 'accountant' || !personId || data.accountant) return;
    const current = version.current;
    void payments.get<AccountantSummary>(`/people/${personId}/accountant-summary`, { year, month }).then(accountant => {
      if (version.current === current) setData(previous => ({ ...previous, accountant }));
    }).catch(error => { if (version.current === current) setMessage(getApiErrorMessage(error)); });
  };
  return <div className='space-y-4'>
    <fieldset disabled={busy} className={panel + ' grid gap-3 sm:grid-cols-3'}>
      <label>Pessoa<select className={input} value={personId} onChange={e => setPersonId(e.target.value)}><option value=''>Selecione</option>{personId && !person && <option value={personId}>Consulta histórica — {personId}</option>}{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Ano<input type='number' min='2000' max='9999' className={input} value={year} onChange={e => setYear(Number(e.target.value))} /></label>
      <label>Mês<select className={input} value={month} onChange={e => setMonth(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label>
    </fieldset>
    <form className='flex flex-wrap items-end gap-2' onSubmit={event => { event.preventDefault(); setPersonId(historicalPersonId.trim()); }}><label className='min-w-0 flex-1 text-sm'>Consultar pessoa removida pelo ID<input required pattern='[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' disabled={busy} className={input} value={historicalPersonId} onChange={event => setHistoricalPersonId(event.target.value)} /></label><Button disabled={busy}>Consultar histórico por ID</Button></form><nav aria-label='Acompanhamento da pessoa' className='flex flex-wrap gap-2'>{[['absences', 'Faltas'], ['monthly', 'Resumo e ajustes'], ...(personId && (!person || person.employmentType === 1) ? [['accountant', 'Contador']] : []), ['dsr', 'DSR histórico'], ['audit', 'Auditoria']].map(([id, label]) => <Button key={id} variant={section === id ? 'primary' : 'outline'} onClick={() => showSection(id)}>{label}</Button>)}</nav>
    <div role='status' className='whitespace-pre-wrap text-sm'>{loading && 'Carregando…'}{message}{Object.entries(errors).map(([key, text]) => <p key={key}>{key}: {text} <button className='underline' onClick={() => setRefresh(x => x + 1)}>Recarregar</button></p>)}</div>
    {!personId && <p>Selecione uma pessoa para consultar.</p>}
    {personId && section === 'absences' && <>
      <form onSubmit={saveAbsence} className={panel}><h2 className='font-bold'>{editing ? 'Editar ocorrência' : 'Registrar falta'}</h2>
        <p className='text-sm'>Uma ocorrência por data, inclusive cancelada. A observação não abona automaticamente a falta. Correções preservam valores de fechamentos anteriores.</p>
        <fieldset disabled={busy || loading} className='grid gap-3 sm:grid-cols-2'>
          <label>Data<input required type='date' className={input} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
          <label>Ocorrência<select className={input} value={String(form.isHalf)} onChange={e => setForm({ ...form, isHalf: e.target.value === 'true' })}><option value='false'>Falta inteira</option><option value='true'>Meia falta</option></select></label>
          <label className='sm:col-span-2'>Observação / motivo<textarea required={form.correctClosedPeriod} maxLength={2000} className={input} value={form.observation} onChange={e => setForm({ ...form, observation: e.target.value })} /></label>
          {editing && <><label><input type='checkbox' checked={form.isCancelled} onChange={e => setForm({ ...form, isCancelled: e.target.checked })} /> Ocorrência cancelada</label><label><input type='checkbox' checked={form.correctClosedPeriod} onChange={e => setForm({ ...form, correctClosedPeriod: e.target.checked })} /> Correção expressa após fechamento (exige motivo)</label></>}
        </fieldset><div className='flex gap-2'><Button disabled={busy || loading || !data.absences} type='submit'>Salvar ocorrência</Button>{editing && <Button type='button' variant='outline' onClick={() => { setEditing(null); setForm(emptyAbsence); }}>Cancelar edição</Button>}</div>
      </form>
      <section className={panel}><h2 className='font-bold'>Faltas da competência</h2><div className='overflow-x-auto'><table className='w-full min-w-[800px] text-left text-sm'><thead><tr>{['Data', 'Tipo', 'Quinzena', 'Estado', 'Observação', 'Criador (ID)', 'Ação'].map(x => <th className='p-2' key={x}>{x}</th>)}</tr></thead><tbody>{data.absences?.map(a => <tr className='border-t border-slate-100' key={a.id}><td className='p-2'>{a.date}</td><td>{a.isHalf ? 'Meia' : 'Inteira'}</td><td>{a.fortnight}</td><td>{a.isCancelled ? 'Cancelada' : 'Ativa'}</td><td className='max-w-xs whitespace-pre-wrap break-words'>{a.observation}</td><td>{a.recordedBy}</td><td><Button disabled={busy} size='sm' onClick={() => { setEditing(a); setForm({ date: a.date, isHalf: a.isHalf, observation: a.observation, isCancelled: a.isCancelled, correctClosedPeriod: false }); }}>Editar / cancelar</Button>{!a.isCancelled && <AuditedDeleteAction key={a.id + ':' + a.revision} path={'/people/' + personId + '/absences/' + a.id} label='Cancelar falta' subject={a.date} explanation='Mantém ID, data e criador, registra o motivo e cancela os efeitos futuros. A data continua ocupada. Fechamentos existentes não são recalculados; diferenças financeiras exigem ajuste separado.' revision={a.revision} requiresRevision allowClosedCorrection disabled={busy || loading} onBusyChange={setBusy} onRefresh={reloadAbsences} />}</td></tr>)}</tbody></table></div>{data.absences?.length === 0 && <p>Nenhuma ocorrência.</p>}</section>
    </>}
    {section === 'monthly' && data.monthly && <>
      <section className={panel}><h2 className='font-bold'>Resumo mensal</h2><p>{data.monthly.isClosed ? 'Mês fechado' : 'Mês ainda aberto'} — fechamento não significa quitação.</p><p>Original fechado: <strong>{money(data.monthly.originalNetTotal)}</strong></p><p>Ajustes (pendentes e liquidados): <strong>{money(data.monthly.adjustmentTotal)}</strong></p>
        {data.monthly.periods.map(p => <p key={p.id}>{p.fortnight}ª quinzena — {money(p.netValue)} — {p.status === 4 ? 'Cancelada — original preservado, fora dos totais ativos' : p.status === 3 ? `Paga em ${p.paidAt}` : 'Fechada, sem pagamento registrado'}</p>)}
      </section>
      <form onSubmit={addAdjustment} className={panel}><h2 className='font-bold'>Ajuste posterior separado</h2><p className='text-sm'>Não altera o valor original nem compensa outra quinzena automaticamente. Positivo: complemento; negativo: redução/devolução.</p><fieldset disabled={busy} className='grid gap-3 sm:grid-cols-2'>
        <label>Fechamento<select required className={input} value={adjustment.calculationId} onChange={e => setAdjustment({ ...adjustment, calculationId: e.target.value })}><option value=''>Selecione</option>{data.monthly.periods.filter(p => [2, 3].includes(p.status)).map(p => <option key={p.id} value={p.id}>{p.fortnight}ª quinzena — {money(p.netValue)}</option>)}</select></label>
        <label>Referência única<input required maxLength={100} className={input} value={adjustment.reference} onChange={e => setAdjustment({ ...adjustment, reference: e.target.value })} /></label>
        <label>Valor com sinal<input required type='number' step='0.01' className={input} value={adjustment.amount} onChange={e => setAdjustment({ ...adjustment, amount: e.target.value })} /></label>
        <label>Motivo<textarea required maxLength={2000} className={input} value={adjustment.reason} onChange={e => setAdjustment({ ...adjustment, reason: e.target.value })} /></label>
      </fieldset><Button disabled={busy}>Registrar ajuste</Button></form>
      <section className={panel}><h2 className='font-bold'>Ajustes</h2>{data.monthly.adjustments.length === 0 && <p>Nenhum ajuste.</p>}{data.monthly.adjustments.map(a => <div key={a.id} className='space-y-2 border-t border-slate-200 py-3'><p><strong>{a.reference}: {money(a.amount)}</strong> — {a.reason}</p>{a.paidAt ? <p>Liquidado em {a.paidAt}</p> : <div className='flex flex-wrap gap-2'><label>Data/hora da liquidação<input type='datetime-local' className={input} value={paidDates[a.id] ?? ''} onChange={e => setPaidDates({ ...paidDates, [a.id]: e.target.value })} /></label><Button disabled={busy || !paidDates[a.id]} onClick={() => settle(a)}>Liquidar ajuste</Button></div>}</div>)}</section>
    </>}
    {section === 'accountant' && data.accountant && <section className={panel}><h2 className='font-bold'>Resumo atual para o contador — {month}/{year}</h2><p>Inteiras: {data.accountant.fullAbsences} · Meias: {data.accountant.halfAbsences} · Dias ponderados: {data.accountant.totalDays}</p>{data.accountant.periods.map(p => <p key={p.fortnight}>{p.fortnight}ª quinzena: {p.fullAbsences} inteiras, {p.halfAbsences} meias, {p.totalDays} dias</p>)}<p className='text-sm'>Ocorrências canceladas aparecem abaixo e não entram nas contagens. Este resumo reflete correções atuais; não registra envio ao contador.</p>{data.accountant.occurrences.map(a => <p key={a.id}>{a.date} — {a.isHalf ? 'Meia' : 'Inteira'} — {a.isCancelled ? 'Cancelada' : 'Ativa'} — {a.observation}</p>)}<Button onClick={() => void navigator.clipboard.writeText(JSON.stringify(data.accountant, null, 2)).then(() => setMessage('Resumo copiado localmente.')).catch(() => setMessage('Não foi possível copiar o resumo.'))}>Copiar resumo local</Button></section>}
    {section === 'dsr' && data.dsr && <section className={panel}><h2 className='font-bold'>Cobranças históricas de DSR — todos os períodos</h2><p className='text-sm'>Cobranças em fechamentos, inclusive ainda não pagos. As origens podem pertencer ao mês anterior.</p>{data.dsr.length === 0 && <p>Nenhuma cobrança.</p>}{data.dsr.map(d => <div key={d.id} className='break-all border-t border-slate-200 py-3'><p>Semana iniciada em {d.weekStart}: {money(d.amount)}</p><p className='font-semibold'>{d.isCancelled ? 'Cancelada — valor original, fora das cobranças ativas' : 'Cobrança ativa no fechamento'}</p><p>Fechamento: {d.paymentCalculationId}</p><p>IDs das faltas de origem: {d.absenceIds.split(',').join(', ')}</p><Button variant='outline' onClick={() => void loadOrigins(d)}>Consultar origens da semana</Button>{origins[d.id]?.map(a => <p key={a.id}>{a.id}: {a.date} — {a.isHalf ? 'Meia' : 'Inteira'} — {a.observation}</p>)}{origins[d.id]?.length === 0 && <p>Origem não localizada nos meses da semana. Consulte outras competências e a auditoria para correções de data.</p>}</div>)}</section>}
    {section === 'audit' && data.audit && <section className={panel}><h2 className='font-bold'>Auditoria — todos os períodos</h2>{data.audit.length === 0 && <p>Nenhum registro.</p>}{data.audit.map(a => <details key={a.id} className='border-t border-slate-200 py-3'><summary className='cursor-pointer'>{a.createdOn} — {a.action} — usuário {a.userId}</summary><p>{a.reason}</p><h3 className='mt-2 font-bold'>Antes</h3><SafeText value={a.before} /><h3 className='mt-2 font-bold'>Depois</h3><SafeText value={a.after} /></details>)}</section>}
  </div>;
}
