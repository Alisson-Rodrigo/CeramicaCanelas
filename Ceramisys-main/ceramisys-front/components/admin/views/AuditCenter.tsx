'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Bell, FileSearch, RefreshCw } from 'lucide-react';

type AuditEvent = { id: string; occurredAtUtc: string; actorDisplayName?: string; actorUserId?: string; category: string; module: string; action: string; outcome: string; resourceType: string; resourceId?: string; ipAddress?: string; statusCode?: number; traceId?: string; technicalContext?: string };
type Notification = { id: string; createdOn: string; title: string; message: string; origin: string; priority: string; readAtUtc?: string | null };
type Page<T> = { items: T[]; total: number; page: number; pageSize: number; unread?: number };

const inputClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800';
const dateLabel = (date: string) => new Date(date).toLocaleString('pt-BR');

export function AuditCenter({ mode = 'events' }: { mode?: 'events' | 'notifications' }) {
  const [events, setEvents] = useState<Page<AuditEvent>>({ items: [], total: 0, page: 1, pageSize: 25 });
  const [notifications, setNotifications] = useState<Page<Notification>>({ items: [], total: 0, page: 1, pageSize: 25, unread: 0 });
  const [filters, setFilters] = useState({ fromUtc: '', toUtc: '', userId: '', module: '', action: '', outcome: '', text: '' });
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      if (mode === 'events') {
        const params = Object.fromEntries(Object.entries({ ...filters, page, pageSize: 25 }).filter(([, value]) => value !== ''));
        const response = await api.get<Page<AuditEvent>>('/api/admin/audit/events', { params }); setEvents(response.data);
      } else {
        const response = await api.get<Page<Notification>>('/api/admin/audit/notifications', { params: { unreadOnly: unreadOnly || undefined, page, pageSize: 25 } }); setNotifications(response.data);
      }
    } catch { setError('Não foi possível carregar os registros. Verifique seu acesso de administrador e a conexão com a API.'); }
    finally { setBusy(false); }
  }, [filters, mode, page, unreadOnly]);

  useEffect(() => { void load(); }, [load]);

  const exportCsv = async () => {
    try {
      const response = await api.get('/api/admin/audit/export', { params: { fromUtc: filters.fromUtc || undefined, toUtc: filters.toUtc || undefined }, responseType: 'blob' });
      const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = 'auditoria.csv'; link.click(); URL.revokeObjectURL(url);
    } catch { setError('Não foi possível exportar os registros.'); }
  };

  const markRead = async (id: string) => { try { await api.patch(`/api/admin/audit/notifications/${id}/read`); await load(); } catch { setError('Não foi possível atualizar a notificação.'); } };
  const pageData = mode === 'events' ? events : notifications;

  return <section className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">{mode === 'events' ? 'Auditoria e diagnóstico' : 'Notificações administrativas'}</h1><p className="mt-1 text-sm text-slate-500">{mode === 'events' ? 'Eventos de negócio, falhas técnicas e alertas de segurança.' : `${notifications.unread ?? 0} não lidas`}</p></div>
      <div className="flex gap-2"><button className={`${inputClass} inline-flex items-center gap-2`} onClick={() => void load()}><RefreshCw size={15}/>Atualizar</button>{mode === 'events' && <button className={`${inputClass} inline-flex items-center gap-2`} onClick={() => void exportCsv()}><FileSearch size={15}/>Exportar CSV</button>}</div>
    </header>
    {mode === 'events' ? <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs text-slate-600">De (UTC)<input className={`${inputClass} mt-1 w-full`} type="datetime-local" value={filters.fromUtc ? filters.fromUtc.slice(0, 16) : ''} onChange={e => { setPage(1); setFilters({ ...filters, fromUtc: e.target.value ? `${e.target.value}:00Z` : '' }); }}/></label>
      <label className="text-xs text-slate-600">Até (UTC)<input className={`${inputClass} mt-1 w-full`} type="datetime-local" value={filters.toUtc ? filters.toUtc.slice(0, 16) : ''} onChange={e => { setPage(1); setFilters({ ...filters, toUtc: e.target.value ? `${e.target.value}:00Z` : '' }); }}/></label>
      <label className="text-xs text-slate-600">Usuário (ID)<input className={`${inputClass} mt-1 w-full`} value={filters.userId} onChange={e => setFilters({ ...filters, userId: e.target.value })}/></label>
      <label className="text-xs text-slate-600">Módulo<input className={`${inputClass} mt-1 w-full`} value={filters.module} onChange={e => setFilters({ ...filters, module: e.target.value })}/></label>
      <label className="text-xs text-slate-600">Ação<input className={`${inputClass} mt-1 w-full`} value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })}/></label>
      <label className="text-xs text-slate-600">Resultado<select className={`${inputClass} mt-1 w-full`} value={filters.outcome} onChange={e => setFilters({ ...filters, outcome: e.target.value })}><option value="">Todos</option><option>Success</option><option>Failure</option></select></label>
      <label className="text-xs text-slate-600 sm:col-span-2">Texto<input className={`${inputClass} mt-1 w-full`} maxLength={100} value={filters.text} onChange={e => setFilters({ ...filters, text: e.target.value })} placeholder="Ação, módulo, recurso ou trace"/></label>
    </div> : <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={unreadOnly} onChange={e => { setPage(1); setUnreadOnly(e.target.checked); }}/>Somente não lidas</label>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {mode === 'events' ? <div className="divide-y divide-slate-100">{events.items.map(event => <article key={event.id} className="grid gap-2 p-4 text-sm md:grid-cols-[180px_1fr_130px]"><time className="text-xs text-slate-500">{dateLabel(event.occurredAtUtc)}</time><div><div className="font-semibold text-slate-800">{event.action} · {event.module}</div><p className="mt-1 text-slate-600">{event.actorDisplayName || event.actorUserId || 'Sistema'} · {event.resourceType}{event.resourceId ? ` #${event.resourceId}` : ''}</p><p className="mt-1 text-xs text-slate-400">{event.category} · IP {event.ipAddress || 'indisponível'} · {event.technicalContext || event.traceId || '—'}</p></div><span className={`h-fit rounded-full px-2 py-1 text-center text-xs ${event.outcome === 'Success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{event.outcome} {event.statusCode ? `· ${event.statusCode}` : ''}</span></article>)}{!events.items.length && <p className="p-8 text-center text-sm text-slate-500">{busy ? 'Carregando…' : 'Nenhum evento encontrado.'}</p>}</div> : <div className="divide-y divide-slate-100">{notifications.items.map(notification => <article key={notification.id} className="flex items-start gap-3 p-4"><Bell className={notification.priority === 'High' ? 'mt-1 text-red-500' : 'mt-1 text-blue-500'} size={18}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-800">{notification.title}</strong><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{notification.priority}</span>{!notification.readAtUtc && <span className="h-2 w-2 rounded-full bg-blue-600" aria-label="Não lida"/>}</div><p className="mt-1 text-sm text-slate-600">{notification.message}</p><p className="mt-1 text-xs text-slate-400">{notification.origin} · {dateLabel(notification.createdOn)}</p></div>{!notification.readAtUtc && <button className={`${inputClass} text-xs`} onClick={() => void markRead(notification.id)}>Marcar lida</button>}</article>)}{!notifications.items.length && <p className="p-8 text-center text-sm text-slate-500">{busy ? 'Carregando…' : 'Nenhuma notificação.'}</p>}</div>}
      <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500"><span>{pageData.total} registros · página {pageData.page}</span><div className="flex gap-2"><button disabled={page <= 1} className={`${inputClass} disabled:opacity-40`} onClick={() => setPage(page - 1)}>Anterior</button><button disabled={page * pageData.pageSize >= pageData.total} className={`${inputClass} disabled:opacity-40`} onClick={() => setPage(page + 1)}>Próxima</button></div></footer>
    </div>
  </section>;
}
