'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

type Metrics = {
  source: 'linux' | 'windows' | 'unavailable';
  isSimulated: boolean;
  measuredAt: string | null;
  cpuUsagePercent: number | null;
  cpuStatus: 'available' | 'warmingUp' | 'unavailable';
  memory: { totalBytes: number; usedBytes: number; availableBytes: number; usagePercent: number } | null;
};

type Backup = {
  fileStatus: 'available' | 'stale' | 'missing' | 'notConfigured' | 'unreadable' | 'invalid';
  attemptStatus: 'unknown' | 'running' | 'succeeded' | 'failed';
  localStatus: 'unknown' | 'pending' | 'succeeded' | 'failed';
  driveStatus: 'unknown' | 'pending' | 'succeeded' | 'failed' | 'skipped';
  startedAt: string | null;
  finishedAt: string | null;
  lastSuccessfulAt: string | null;
  errorMessage: string | null;
};

type Status = { metrics: Metrics; backup: Backup };

const interval = 30_000;
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Fortaleza',
});
const numberFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const formatDate = (value: string | null) => value ? dateFormatter.format(new Date(value)) : 'Indisponível';
const formatGiB = (value: number) => `${numberFormatter.format(value / 1024 ** 3)} GiB`;

const statusLabels = {
  unknown: 'Indisponível', pending: 'Pendente', running: 'Em execução',
  succeeded: 'Concluído', failed: 'Falhou', skipped: 'Não realizado',
};

function Usage({ label, value }: { label: string; value: number | null }) {
  if (value === null) return <p className="text-sm text-slate-600">Indisponível</p>;
  return (
    <>
      <p className="text-xl font-semibold tabular-nums text-slate-900">{numberFormatter.format(value)}%</p>
      <progress
        className="mt-2 block h-2 w-full appearance-none overflow-hidden rounded-sm bg-[var(--surface-muted)] [&::-webkit-progress-bar]:bg-[var(--surface-muted)] [&::-webkit-progress-value]:bg-orange-700 [&::-moz-progress-bar]:bg-orange-700"
        value={value}
        max={100}
        aria-label={label}
      />
    </>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-2 sm:gap-4">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function BackupLabel({ status }: { status: keyof typeof statusLabels }) {
  return <span className={status === 'failed' ? 'text-red-700 [html[data-theme=dark]_&]:text-red-300' : undefined}>{statusLabels[status]}</span>;
}

export function ServerStatus() {
  const [data, setData] = useState<Status>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const active = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (active.current) return;
    const request = new AbortController();
    active.current = request;
    setBusy(true);
    try {
      const response = await api.get<Status>('/api/admin/server-status', { signal: request.signal, timeout: 8000 });
      if (!request.signal.aborted) {
        setData(response.data);
        setError(false);
      }
    } catch {
      if (!request.signal.aborted) setError(true);
    } finally {
      if (active.current === request) {
        active.current = null;
        setBusy(false);
      }
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, interval);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      active.current?.abort();
      active.current = null;
    };
  }, [refresh]);

  const metrics = data?.metrics;
  const backup = data?.backup;
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-2 sm:p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Status do Servidor</h1>
          <p className="mt-1 text-sm text-slate-600">Uso de recursos e andamento dos backups.</p>
        </div>
        <Button type="button" variant="outline" icon={RefreshCw} isLoading={busy} onClick={refresh}>
          {busy ? 'Atualizando…' : 'Atualizar'}
        </Button>
      </header>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 [html[data-theme=dark]_&]:text-red-300">
          {data ? 'Falha ao atualizar. Os dados exibidos são da última consulta bem-sucedida.' : 'Não foi possível consultar o status do servidor. Tente atualizar.'}
        </p>
      )}
      {!data && busy && <p role="status" className="px-2 py-4 text-sm text-slate-600">Consultando o servidor…</p>}

      {metrics && (
        <section className="rounded-xl border border-slate-200 bg-white" aria-labelledby="host-metrics-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <h2 id="host-metrics-title" className="font-semibold text-slate-900">Recursos do servidor</h2>
            <p className="text-xs text-slate-600">Última coleta {formatDate(metrics.measuredAt)}</p>
          </div>
          {(metrics.source === 'windows' || metrics.isSimulated) && (
            <p className="border-b border-slate-200 px-4 py-2 text-sm text-slate-600">
              {metrics.isSimulated ? 'Dados simulados de desenvolvimento' : 'Métricas reais do computador Windows que executa a API'}
            </p>
          )}
          <div className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="space-y-2 p-4">
              <h3 className="text-sm font-semibold text-slate-800">CPU</h3>
              {metrics.cpuStatus === 'warmingUp'
                ? <p className="text-sm text-slate-600">Aguardando duas leituras da CPU…</p>
                : <Usage label="Utilização da CPU" value={metrics.cpuUsagePercent} />}
            </div>
            <div className="space-y-2 p-4">
              <h3 className="text-sm font-semibold text-slate-800">RAM</h3>
              <Usage label="Utilização da RAM" value={metrics.memory?.usagePercent ?? null} />
              {metrics.memory && <p className="text-sm tabular-nums text-slate-600">
                {formatGiB(metrics.memory.usedBytes)} de {formatGiB(metrics.memory.totalBytes)} em uso · {formatGiB(metrics.memory.availableBytes)} disponíveis
              </p>}
            </div>
          </div>
        </section>
      )}

      {backup && (
        <section className="rounded-xl border border-slate-200 bg-white" aria-labelledby="backup-status-title">
          <h2 id="backup-status-title" className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-900">Backups</h2>
          {backup.fileStatus === 'stale' && <p className="bg-amber-50 px-4 py-2 text-sm text-amber-800" role="status">
            O status está desatualizado. Os resultados abaixo correspondem ao último registro publicado.
          </p>}
          <dl className="divide-y divide-slate-200">
            <Detail label="Último sucesso completo">{formatDate(backup.lastSuccessfulAt)}</Detail>
            <Detail label="Última execução"><BackupLabel status={backup.attemptStatus} /></Detail>
            <Detail label="Início">{formatDate(backup.startedAt)}</Detail>
            <Detail label="Fim">{backup.attemptStatus === 'running' ? 'Em andamento' : formatDate(backup.finishedAt)}</Detail>
            <Detail label="Backup local"><BackupLabel status={backup.localStatus} /></Detail>
            <Detail label="Envio ao Google Drive"><BackupLabel status={backup.driveStatus} /></Detail>
          </dl>
          {backup.errorMessage && <p className="border-t border-slate-200 px-4 py-3 text-sm text-slate-700">{backup.errorMessage}</p>}
        </section>
      )}
      {data && <p className="text-xs text-slate-600">Horário de Fortaleza. Atualização automática a cada 30 segundos enquanto a tela estiver visível.</p>}
    </div>
  );
}
