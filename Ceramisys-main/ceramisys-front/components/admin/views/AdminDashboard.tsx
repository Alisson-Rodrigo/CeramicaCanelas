'use client';

import { useEffect, useState } from 'react';
import { Activity, Bell, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

type AuditRow = { id: string; occurredAtUtc: string; actorDisplayName?: string; action: string; module: string; category: string; outcome: string };
type DashboardData = { items: AuditRow[]; total: number };

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData>();
  const [error, setError] = useState('');
  useEffect(() => { api.get<DashboardData>('/api/admin/audit/events', { params: { page: 1, pageSize: 6 } }).then(r => setData(r.data)).catch(() => setError('Não foi possível consultar os dados administrativos.')); }, []);
  return <div className="space-y-6 p-2 sm:p-4">
    <header><h1 className="text-2xl font-bold text-slate-900">Administração</h1><p className="mt-1 text-slate-500">Acompanhe os eventos reais de auditoria e segurança do sistema.</p></header>
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-5"><Activity className="mb-3 text-blue-600"/><p className="text-xs font-bold uppercase text-slate-400">Eventos encontrados</p><strong className="text-2xl text-slate-800">{data?.total ?? '—'}</strong></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><ShieldCheck className="mb-3 text-emerald-600"/><p className="text-xs font-bold uppercase text-slate-400">Fonte</p><strong className="text-base text-slate-800">API de auditoria</strong></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><Bell className="mb-3 text-amber-600"/><p className="text-xs font-bold uppercase text-slate-400">Atualização</p><strong className="text-base text-slate-800">Dados em tempo de consulta</strong></div>
    </div>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <h2 className="border-b border-slate-100 p-4 font-semibold text-slate-800">Atividade recente</h2>
      {error && <p role="alert" className="p-4 text-sm text-red-700">{error}</p>}
      <div className="divide-y divide-slate-100">{data?.items.map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-2 p-4"><div><p className="font-medium text-slate-800">{item.action} · {item.module}</p><p className="text-sm text-slate-500">{item.actorDisplayName || 'Sistema'} · {item.category}</p></div><div className="text-right text-xs text-slate-500"><p>{new Date(item.occurredAtUtc).toLocaleString('pt-BR')}</p><p>{item.outcome}</p></div></article>)}{data && data.items.length === 0 && <p className="p-6 text-sm text-slate-500">Nenhum evento registrado ainda.</p>}{!data && !error && <p className="p-6 text-sm text-slate-500">Carregando atividade…</p>}</div>
    </section>
  </div>;
}
