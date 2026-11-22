'use client';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { deletionRequest, payments } from '@/lib/payments';
import { getApiErrorMessage } from '@/lib/api-error';

interface Props {
  path: string; label: string; subject: string; explanation: string;
  revision?: number; requiresRevision?: boolean; allowClosedCorrection?: boolean;
  disabled?: boolean; onRefresh: () => void | Promise<void>; onDeleted?: () => void;
  beforeDelete?: () => Promise<string | null>; onBusyChange?: (busy: boolean) => void;
}
/** Native modal + portal: keyboard focus is trapped and no nested forms are created. */
export function AuditedDeleteAction({ path, label, subject, explanation, revision, requiresRevision, allowClosedCorrection, disabled, onRefresh, onDeleted, beforeDelete, onBusyChange }: Props) {
  const [open, setOpen] = useState(false); const [reason, setReason] = useState(''); const [confirmed, setConfirmed] = useState(false);
  const [correctClosedPeriod, setCorrectClosedPeriod] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [blocked, setBlocked] = useState(false); const [completed, setCompleted] = useState(false);
  const lock = useRef(false); const dialog = useRef<HTMLDialogElement>(null); const title = useId(); const description = useId();
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  const close = () => { if (!lock.current) setOpen(false); };
  const refresh = async () => {
    if (lock.current) return; lock.current = true; setBusy(true); onBusyChange?.(true);
    try { await onRefresh(); setBlocked(false); setConfirmed(false); setError(''); setOpen(false); }
    catch (e) { setError(getApiErrorMessage(e) + ' Não foi possível conferir o estado atual.'); }
    finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (lock.current || blocked || completed || !confirmed || disabled) return;
    let body;
    try {
      if (requiresRevision && revision === undefined) throw new Error('Revisão indisponível. Atualize os dados.');
      body = deletionRequest(reason, revision, allowClosedCorrection ? correctClosedPeriod : undefined);
    } catch (e) { setError((e as Error).message); return; }
    lock.current = true; setBusy(true); onBusyChange?.(true); setError('');
    try {
      const restriction = await beforeDelete?.();
      if (restriction) { setError(restriction); setBlocked(true); return; }
      await payments.delete(path, body); setCompleted(true); onDeleted?.();
      try { await onRefresh(); setOpen(false); }
      catch (e) { setError('A ação foi concluída, mas os dados não puderam ser atualizados. ' + getApiErrorMessage(e)); setBlocked(true); }
    } catch (e) {
      const message = e instanceof Error && !('isAxiosError' in e) ? e.message : getApiErrorMessage(e);
      setError(message + ' Atualize e reconfira os dados antes de tentar novamente.'); setBlocked(true); setConfirmed(false);
    } finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
  };
  return <>
    <Button type='button' size='sm' variant='outline' disabled={disabled || busy || completed} onClick={() => { setConfirmed(false); setOpen(true); }}>{label}</Button>
    {open && createPortal(<dialog ref={dialog} aria-labelledby={title} aria-describedby={description} onCancel={event => { event.preventDefault(); close(); }} className='m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 text-slate-800 shadow-xl backdrop:bg-black/50'>
      <form onSubmit={submit} className='space-y-4'>
        <h2 id={title} className='text-lg font-bold'>{label} — {subject}</h2>
        <p id={description} className='text-sm'>{explanation}</p>
        <label className='block text-sm'>Motivo da ação<textarea autoFocus required maxLength={2000} disabled={busy || completed} className='mt-1 w-full rounded-lg border border-slate-300 p-2' value={reason} onChange={event => setReason(event.target.value)} /></label>
        {allowClosedCorrection && <label className='block text-sm'><input type='checkbox' disabled={busy || completed} checked={correctClosedPeriod} onChange={event => setCorrectClosedPeriod(event.target.checked)} /> Autorizo expressamente a correção em período fechado; o snapshot não será recalculado.</label>}
        <label className='block text-sm'><input required type='checkbox' disabled={busy || completed} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Confirmo a ação descrita acima.</label>
        {error && <p role='alert' className='whitespace-pre-wrap text-sm text-red-700'>{error}</p>}
        <div className='flex flex-wrap justify-end gap-2'>
          <Button type='button' variant='outline' disabled={busy} onClick={close}>Voltar</Button>
          {blocked ? <Button type='button' disabled={busy} onClick={() => void refresh()}>Atualizar e reconferir</Button> : <Button type='submit' variant='danger' disabled={busy || !confirmed || !reason.trim() || completed}>Confirmar ação</Button>}
        </div>
      </form>
    </dialog>, document.body)}
  </>;
}
