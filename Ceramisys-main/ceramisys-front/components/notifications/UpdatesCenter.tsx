'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, Check, X,
  CircleCheck, FileText, LoaderCircle, Package, Search, ShoppingCart, Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatUpdateDate, formatUpdateDay, getUpdateDateKey } from '@/lib/update-format';
import { markUpdateAsRead, type UpdatePage, type UpdateRecord } from '@/lib/notification-state';
import styles from './notifications.module.css';

const PAGE_SIZE = 25;
type DateFilter = 'all' | '7' | '30' | '90';
type StatusFilter = 'all' | 'unread' | 'read';

function getModuleIcon(module: string) {
  if (module === 'Financeiro' || module === 'Pagamentos') return Wallet;
  if (module === 'Vendas') return ShoppingCart;
  if (module === 'Almoxarifado') return Package;
  return FileText;
}

function isHighPriority(priority: string) {
  return ['high', 'critical', 'alta', 'crítica'].includes(priority.toLocaleLowerCase('pt-BR'));
}

function dateBounds(filter: DateFilter) {
  if (filter === 'all') return {};
  const from = new Date();
  from.setDate(from.getDate() - Number(filter));
  return { fromUtc: from.toISOString(), toUtc: new Date().toISOString() };
}

function groupUpdates(items: UpdateRecord[]) {
  const groups = new Map<string, { label: string; items: UpdateRecord[] }>();
  const now = new Date();
  for (const item of items) {
    const key = getUpdateDateKey(item.occurredAtUtc);
    const group = groups.get(key) ?? { label: formatUpdateDay(item.occurredAtUtc, now), items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, group]) => ({ key, ...group }));
}

type UpdatesCenterProps = { presentation?: 'page' | 'modal'; onClose?: () => void };

export function UpdatesCenter({ presentation = 'page', onClose }: UpdatesCenterProps) {
  const router = useRouter();
  const dialogId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const [result, setResult] = useState<UpdatePage>({ items: [], total: 0, unread: 0, page: 1, pageSize: PAGE_SIZE, availableModules: [] });
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<DateFilter>('all');
  const [module, setModule] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const response = await api.get<UpdatePage>('/api/notifications', {
        params: {
          page,
          pageSize: PAGE_SIZE,
          status,
          ...(module ? { module } : {}),
          ...(search ? { search } : {}),
          ...dateBounds(period),
        },
      });
      setResult(response.data);
    } catch {
      setError('Não foi possível carregar as atualizações. Confira sua conexão e tente novamente.');
    } finally {
      setBusy(false);
    }
  }, [module, page, period, search, status]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (presentation !== 'modal') return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current?.(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]')];
      if (!focusable.length) { event.preventDefault(); dialogRef.current.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [presentation]);

  const markRead = async (id: string) => {
    const previous = result;
    setPendingId(id);
    setActionError('');
    setResult(current => markUpdateAsRead(current, id, new Date().toISOString(), status === 'unread'));
    try {
      await api.patch(`/api/notifications/${id}/read`);
      if (status === 'unread' && previous.items.length === 1 && page > 1) setPage(value => value - 1);
    } catch {
      setResult(previous);
      setActionError('Não foi possível marcar a atualização como lida. A lista foi restaurada.');
    } finally {
      setPendingId(null);
    }
  };

  const clearFilters = () => {
    setPeriod('all');
    setModule('');
    setStatus('all');
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const groups = useMemo(() => groupUpdates(result.items), [result.items]);
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const hasFilters = period !== 'all' || module !== '' || status !== 'all' || search !== '' || searchInput !== '';

  const content = <div className={styles.centerShell}>
      {presentation === 'page' && <div className={styles.centerTopbar}>
        <div className={styles.brand}><span className={styles.brandMark}><Bell size={18} aria-hidden="true" /></span><span>Cerâmica Canelas</span></div>
        <button type="button" onClick={() => router.push('/dashboard')} className={styles.backButton}><ArrowLeft size={15} aria-hidden="true" />Voltar ao sistema</button>
      </div>}

      <header className={styles.centerHeading}>
        <div><h1 id={presentation === 'modal' ? `${dialogId}-title` : undefined} className={styles.headingTitle}>Atualizações</h1><p className={styles.headingDescription}>Alterações relevantes nos módulos que você pode acessar.</p></div>
        <span className={styles.headingCount}>{result.unread} não lidas</span>
      </header>

      <form className={styles.filterPanel} role="search" onSubmit={event => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}>
        <label className={styles.filterGroup}>
          <span className={styles.filterLabel}>Período</span>
          <select className={styles.filterControl} value={period} onChange={event => { setPeriod(event.target.value as DateFilter); setPage(1); }}>
            <option value="all">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option>
          </select>
        </label>
        <label className={styles.filterGroup}>
          <span className={styles.filterLabel}>Módulo</span>
          <select className={styles.filterControl} value={module} onChange={event => { setModule(event.target.value); setPage(1); }}>
            <option value="">Todos os módulos</option>
            {(result.availableModules ?? []).map(option => <option value={option} key={option}>{option}</option>)}
          </select>
        </label>
        <label className={styles.filterGroup}>
          <span className={styles.filterLabel}>Status</span>
          <select className={styles.filterControl} value={status} onChange={event => { setStatus(event.target.value as StatusFilter); setPage(1); }}>
            <option value="all">Todas</option><option value="unread">Não lidas</option><option value="read">Lidas</option>
          </select>
        </label>
        <label className={`${styles.filterGroup} ${styles.filterGroupSearch}`}>
          <span className={styles.filterLabel}>Buscar atualizações</span>
          <span className={styles.searchWrap}><Search size={15} aria-hidden="true" /><input className={styles.filterControl} type="search" maxLength={100} value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Pessoa, ação ou módulo" aria-label="Buscar atualizações por pessoa, ação ou módulo" /></span>
        </label>
      </form>

      <div className={styles.resultsBar}>
        <span><strong>{result.total}</strong> {result.total === 1 ? 'atualização encontrada' : 'atualizações encontradas'}</span>
        <span>Ordenadas da mais recente para a mais antiga</span>
      </div>

      {actionError && <p role="alert" className={styles.stateText}>{actionError}</p>}
      <section className={styles.updatesPanel} aria-label="Lista de atualizações" aria-busy={busy}>
        {busy && <div className={styles.centerState}><div><LoaderCircle size={24} className="animate-spin" aria-hidden="true" /><p className={styles.centerStateText}>Carregando atualizações…</p></div></div>}
        {!busy && error && <div className={styles.centerState} role="alert"><div><span className={styles.centerStateIcon}><AlertTriangle size={21} aria-hidden="true" /></span><p className={styles.centerStateTitle}>Não foi possível carregar</p><p className={styles.centerStateText}>{error}</p><button type="button" className={styles.clearFilters} onClick={() => void load()}>Tentar novamente</button></div></div>}
        {!busy && !error && result.items.length === 0 && <div className={styles.centerState}><div><span className={styles.centerStateIcon}><CircleCheck size={22} aria-hidden="true" /></span><p className={styles.centerStateTitle}>{hasFilters ? 'Nenhum resultado para esses filtros' : 'Nenhuma atualização disponível'}</p><p className={styles.centerStateText}>{hasFilters ? 'Ajuste ou limpe os filtros para ver outras atualizações.' : 'Quando houver uma alteração relevante nos módulos que você acessa, ela aparecerá aqui.'}</p>{hasFilters && <button type="button" className={styles.clearFilters} onClick={clearFilters}>Limpar filtros</button>}</div></div>}
        {!busy && !error && groups.map(group => <section key={group.key} className={styles.dateGroup} aria-label={group.label}>
          <h2 className={styles.dateHeading}>{group.label}</h2>
          {group.items.map(item => {
            const Icon = getModuleIcon(item.module);
            const highPriority = isHighPriority(item.priority);
            return <article key={item.id} className={`${styles.centerItem} ${item.readAtUtc ? '' : styles.centerItemUnread} ${highPriority ? styles.priorityItem : ''}`}>
              <span className={`${styles.moduleIcon} ${styles.centerIcon} ${item.readAtUtc ? styles.readIcon : ''}`}><Icon size={18} aria-hidden="true" /></span>
              <div className={styles.itemContent}>
                <p className={styles.centerMessage}>{item.message}</p>
                <div className={styles.centerMeta}>
                  <span className={styles.moduleLabel}><Icon size={13} aria-hidden="true" />{item.module}</span>
                  <time dateTime={item.occurredAtUtc}>{formatUpdateDate(item.occurredAtUtc)}</time>
                  <span className={`${styles.centerStatus} ${item.readAtUtc ? styles.centerStatusRead : styles.centerStatusUnread}`}><span className={styles.statusDot} />{item.readAtUtc ? 'Lida' : 'Não lida'}</span>
                  {highPriority && <span className={styles.centerPriority}><AlertTriangle size={12} aria-hidden="true" />Prioridade alta</span>}
                </div>
              </div>
              <div className={styles.centerActions}>
                {item.readAtUtc
                  ? <span className={styles.centerReadLabel}><CircleCheck size={14} aria-hidden="true" /> Já lida</span>
                  : <button type="button" disabled={pendingId === item.id} onClick={() => void markRead(item.id)} className={styles.centerMark} aria-label={`Marcar atualização de ${item.module} como lida`}><Check size={14} aria-hidden="true" />Marcar como lida</button>}
              </div>
            </article>;
          })}
        </section>)}
      </section>

      <nav aria-label="Paginação das atualizações" className={styles.pagination}>
        <button type="button" disabled={page <= 1 || busy} onClick={() => setPage(value => value - 1)} className={styles.paginationButton}><ArrowLeft size={14} aria-hidden="true" />Anterior</button>
        <span>Página {page} de {pages}</span>
        <button type="button" disabled={page >= pages || busy} onClick={() => setPage(value => value + 1)} className={styles.paginationButton}>Próxima<ArrowRight size={14} aria-hidden="true" /></button>
      </nav>
    </div>;

  if (presentation === 'modal') return <div className={styles.modalOverlay} onMouseDown={event => { if (event.target === event.currentTarget) onClose?.(); }}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`${dialogId}-title`} className={`${styles.root} ${styles.updatesModal}`}>
      <header className={styles.modalHeader}>
        <div className={styles.brand}><span className={styles.brandMark}><Bell size={18} aria-hidden="true" /></span><span>Cerâmica Canelas</span></div>
        <button type="button" onClick={onClose} className={styles.modalClose} aria-label="Fechar atualizações" title="Fechar"><X size={19} aria-hidden="true" /></button>
      </header>
      <div className={styles.modalBody}>{content}</div>
    </section>
  </div>;

  return <main className={`${styles.root} ${styles.centerPage}`}>{content}</main>;
}
