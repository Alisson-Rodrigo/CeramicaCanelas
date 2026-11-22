'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { formatUpdateDate } from '@/lib/update-format';

type Update = { id: string; message: string; module: string; priority: string; createdOn: string; readAtUtc?: string | null; occurredAtUtc: string };
type UpdatePage = { items: Update[]; total: number; unread: number; page: number; pageSize: number };

export function UpdatesCenter() {
  const router = useRouter();
  const [result, setResult] = useState<UpdatePage>({ items: [], total: 0, unread: 0, page: 1, pageSize: 25 });
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try { const response = await api.get<UpdatePage>('/api/notifications', { params: { page, pageSize: 25 } }); setResult(response.data); }
    catch { setError('Não foi possível carregar as atualizações.'); }
    finally { setBusy(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);
  const markRead = async (id: string) => { try { await api.patch(`/api/notifications/${id}/read`); await load(); } catch { setError('Não foi possível marcar a atualização como lida.'); } };
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return <main className="min-h-dvh bg-slate-50 p-4 sm:p-8">
    <div className="mx-auto max-w-4xl">
      <button type="button" onClick={() => router.push('/dashboard')} className="mb-5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-white focus-visible:outline-2 focus-visible:outline-orange-700"><ArrowLeft size={17}/>Voltar ao sistema</button>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-orange-700">Cerâmica Canelas</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Atualizações</h1><p className="mt-1 text-sm text-slate-600">Alterações relevantes nos módulos que você pode acessar.</p></div><span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-800">{result.unread} não lidas</span></header>
      <section aria-label="Lista de atualizações" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {busy && <p className="p-8 text-center text-sm text-slate-500">Carregando atualizações…</p>}
        {error && <p role="alert" className="p-6 text-sm text-red-700">{error} <button className="ml-2 underline" onClick={() => void load()}>Tentar novamente</button></p>}
        {!busy && !error && result.items.length === 0 && <div className="p-12 text-center"><Bell className="mx-auto mb-3 text-slate-300" size={28}/><p className="font-medium text-slate-700">Nenhuma atualização disponível</p><p className="mt-1 text-sm text-slate-500">Quando houver uma alteração relevante, ela aparecerá aqui.</p></div>}
        {!busy && result.items.map(item => <article key={item.id} className={`border-b border-slate-100 p-4 sm:p-5 ${item.readAtUtc ? '' : 'bg-orange-50/50'}`}><div className="flex items-start gap-3"><Bell size={18} className="mt-1 shrink-0 text-orange-600" aria-hidden="true"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{item.message}</h2>{!item.readAtUtc && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">Nova</span>}</div><p className="mt-1 text-sm text-slate-600">{item.module}</p><time className="mt-2 block text-xs text-slate-500" dateTime={item.occurredAtUtc}>{formatUpdateDate(item.occurredAtUtc)}</time></div>{!item.readAtUtc && <button type="button" onClick={() => void markRead(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-orange-700" aria-label={`Marcar atualização de ${item.module} como lida`}><Check size={14}/>Lida</button>}</div></article>)}
      </section>
      <nav aria-label="Paginação das atualizações" className="mt-4 flex items-center justify-between"><button type="button" disabled={page <= 1 || busy} onClick={() => setPage(value => value - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50">Anterior</button><span className="text-sm text-slate-500">Página {page} de {pages}</span><button type="button" disabled={page >= pages || busy} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50">Próxima</button></nav>
    </div>
  </main>;
}
