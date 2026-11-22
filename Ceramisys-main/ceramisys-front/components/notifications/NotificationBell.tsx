'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Volume2, VolumeX, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatUpdateDate } from '@/lib/update-format';

type Update = {
  id: string; message: string; module: string; priority: string;
  createdOn: string; readAtUtc?: string | null; occurredAtUtc: string;
};
type UpdatePage = { items: Update[]; total: number; unread: number; page: number; pageSize: number };
const notifiedKey = 'ceramisys-notified-update-ids';

export function shouldAnnounceUpdate(update: Update) {
  return !update.readAtUtc;
}

export function findFreshNotificationIds(items: Update[], seenIds: string[]) {
  const seen = new Set(seenIds);
  return items.filter(item => !seen.has(item.id)).map(item => item.id);
}

export function shouldPlayNotificationSound(isMuted: boolean, hasUserInteracted: boolean) {
  return !isMuted && hasUserInteracted;
}

function playTone(audio: AudioContext) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 740;
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.07, audio.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.18);
  oscillator.connect(gain); gain.connect(audio.destination);
  oscillator.start(); oscillator.stop(audio.currentTime + 0.2);
}

export function NotificationBell({ updatesHref = '/dashboard/updates' }: { updatesHref?: string }) {
  const router = useRouter();
  const [page, setPage] = useState<UpdatePage>({ items: [], total: 0, unread: 0, page: 1, pageSize: 10 });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<Update | null>(null);
  const [muted, setMuted] = useState(false);
  const readyForAudio = useRef(false);
  const audioContext = useRef<AudioContext | null>(null);
  const initialized = useRef(false);

  const refresh = useCallback(async (announce = false) => {
    try {
      const response = await api.get<UpdatePage>('/api/notifications', { params: { page: 1, pageSize: 10 } });
      const next = response.data;
      setPage(next); setError(''); setBusy(false);
      if (!initialized.current) { initialized.current = true; return; }
      if (!announce) return;
      const seen = new Set<string>();
      try { JSON.parse(sessionStorage.getItem(notifiedKey) || '[]').forEach((id: string) => seen.add(id)); } catch { /* sessão inválida é ignorada */ }
      const freshIds = findFreshNotificationIds(next.items, [...seen]);
      const fresh = next.items.filter(item => freshIds.includes(item.id));
      if (!fresh.length) return;
      fresh.forEach(item => seen.add(item.id));
      sessionStorage.setItem(notifiedKey, JSON.stringify([...seen].slice(-100)));
      const incoming = fresh.filter(shouldAnnounceUpdate);
      const newest = incoming[0];
      if (newest) {
        setToast(newest);
        if (audioContext.current && shouldPlayNotificationSound(muted, readyForAudio.current)) void audioContext.current.resume().then(() => playTone(audioContext.current!)).catch(() => {});
      }
    } catch {
      setError('Não foi possível carregar as atualizações.');
      setBusy(false);
    }
  }, [muted]);
  useEffect(() => {
    if (localStorage.getItem('ceramisys-notifications-muted') === 'true') window.setTimeout(() => setMuted(true), 0);
    const initialFetch = window.setTimeout(() => void refresh(false), 0);
    const poll = window.setInterval(() => void refresh(true), 45_000);
    const unlock = () => {
      readyForAudio.current = true;
      const AudioContextType = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextType && !audioContext.current) audioContext.current = new AudioContextType();
      if (audioContext.current?.state === 'suspended') void audioContext.current.resume().catch(() => {});
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => { window.clearTimeout(initialFetch); window.clearInterval(poll); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, [refresh]);

  useEffect(() => () => { if (audioContext.current) void audioContext.current.close().catch(() => {}); }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setPage(current => ({ ...current, unread: Math.max(0, current.unread - (current.items.find(item => item.id === id && !item.readAtUtc) ? 1 : 0)), items: current.items.map(item => item.id === id ? { ...item, readAtUtc: new Date().toISOString() } : item) }));
    } catch { setError('Não foi possível marcar a atualização como lida.'); }
  };
  const toggleMute = () => setMuted(current => { localStorage.setItem('ceramisys-notifications-muted', String(!current)); return !current; });

  return <>
    <div className="relative">
      <button type="button" onClick={() => { const next = !open; setOpen(next); if (next) void refresh(false); }} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-orange-700" aria-label={`Atualizações${page.unread ? `, ${page.unread} não lidas` : ''}`} aria-expanded={open} aria-controls="global-updates-popover">
        <Bell size={20} aria-hidden="true" />
        {page.unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-orange-600 px-1 text-center text-[10px] font-bold leading-5 text-white" aria-hidden="true">{page.unread > 99 ? '99+' : page.unread}</span>}
      </button>
      {open && <section id="global-updates-popover" aria-label="Atualizações recentes" className="absolute right-0 top-12 z-[70] w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-3"><h2 className="font-semibold text-slate-800">Atualizações recentes</h2><button type="button" onClick={toggleMute} className="rounded p-2 text-slate-500 hover:bg-slate-100" aria-label={muted ? 'Ativar som' : 'Silenciar notificações'} title={muted ? 'Ativar som' : 'Silenciar notificações'}>{muted ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button></div>
        <div className="max-h-[60vh] overflow-y-auto" aria-live="polite">{busy && <p className="p-4 text-sm text-slate-500">Carregando atualizações…</p>}{error && <p role="alert" className="p-4 text-sm text-red-700">{error}</p>}{!busy && !error && page.items.length === 0 && <p className="p-5 text-center text-sm text-slate-500">Nenhuma atualização recente.</p>}{page.items.map(item => <article key={item.id} className={`border-b border-slate-100 p-3 ${item.readAtUtc ? '' : 'bg-orange-50/50'}`}><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{item.message}</p><p className="mt-0.5 text-xs text-slate-600">{item.module}</p><time className="mt-1 block text-xs text-slate-400" dateTime={item.occurredAtUtc}>{formatUpdateDate(item.occurredAtUtc)}</time></div>{!item.readAtUtc && <button type="button" onClick={() => void markRead(item.id)} className="rounded p-1.5 text-slate-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-orange-700" aria-label={`Marcar atualização de ${item.module} como lida`}><Check size={16}/></button>}</div></article>)}</div>
        <button type="button" onClick={() => router.push(updatesHref)} className="w-full p-3 text-sm font-semibold text-orange-700 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-orange-700">Abrir área de atualizações</button>
      </section>}
    </div>
    {toast && <div role="status" aria-live="polite" className="fixed right-4 top-20 z-[80] flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-orange-200 bg-white p-4 shadow-xl"><Bell size={18} className="mt-0.5 shrink-0 text-orange-600" aria-hidden="true"/><div className="min-w-0 flex-1"><strong className="block text-sm text-slate-800">Nova atualização</strong><p className="mt-1 text-sm text-slate-600">{toast.message} · {toast.module}</p><time className="mt-1 block text-xs text-slate-400" dateTime={toast.occurredAtUtc}>{formatUpdateDate(toast.occurredAtUtc)}</time></div><button type="button" onClick={() => setToast(null)} aria-label="Fechar aviso" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={16}/></button></div>}
  </>;
}
