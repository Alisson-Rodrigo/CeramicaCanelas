'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  AlertTriangle, Bell, Check, CircleCheck, ExternalLink, FileText,
  LoaderCircle, Package, ShoppingCart, Volume2, VolumeX, Wallet, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatUpdateDate } from '@/lib/update-format';
import { UpdatesCenter } from '@/components/notifications/UpdatesCenter';
import {
  getAnnounceableUpdates, markUpdateAsRead, mergeSeenNotificationIds,
  shouldPlayNotificationSound, type UpdatePage, type UpdateRecord,
} from '@/lib/notification-state';
import styles from './notifications.module.css';

const notifiedKey = 'ceramisys-notified-update-ids';
const muteKey = 'ceramisys-notifications-muted';

function readSeenIds() {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(notifiedKey) || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function rememberIds(items: UpdateRecord[]) {
  try { sessionStorage.setItem(notifiedKey, JSON.stringify(mergeSeenNotificationIds(readSeenIds(), items))); } catch { /* armazenamento da sessão pode estar desativado */ }
}

function ModuleIcon({ module, size = 17 }: { module: string; size?: number }) {
  if (module === 'Financeiro' || module === 'Pagamentos') return <Wallet size={size} aria-hidden="true" />;
  if (module === 'Vendas') return <ShoppingCart size={size} aria-hidden="true" />;
  if (module === 'Almoxarifado') return <Package size={size} aria-hidden="true" />;
  return <FileText size={size} aria-hidden="true" />;
}

function isHighPriority(priority: string) {
  return ['high', 'critical', 'alta', 'crítica'].includes(priority.toLocaleLowerCase('pt-BR'));
}

function playTone(audio: AudioContext) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, audio.currentTime + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.16);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.18);
}

export function NotificationBell() {
  const popoverId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const refreshInFlight = useRef(false);
  const initialized = useRef(false);
  const readyForAudio = useRef(false);
  const audioContext = useRef<AudioContext | null>(null);
  const dismissTimer = useRef<number | null>(null);
  const [page, setPage] = useState<UpdatePage>({ items: [], total: 0, unread: 0, page: 1, pageSize: 10 });
  const [open, setOpen] = useState(false);
  const [centerOpen, setCenterOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<UpdateRecord | null>(null);
  const [toastLeaving, setToastLeaving] = useState(false);
  const [muted, setMuted] = useState(false);

  const refresh = useCallback(async (announce = false) => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const response = await api.get<UpdatePage>('/api/notifications', { params: { page: 1, pageSize: 10 } });
      const next = response.data;
      setPage(next);
      setError('');
      setBusy(false);
      const seenIds = readSeenIds();
      if (!initialized.current) {
        initialized.current = true;
        rememberIds(next.items);
        return;
      }
      const incoming = announce ? getAnnounceableUpdates(next.items, seenIds, true) : [];
      rememberIds(next.items);
      if (incoming.length === 0) return;
      if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
      setToast(incoming[0]);
      setToastLeaving(false);
      if (audioContext.current && shouldPlayNotificationSound(muted, readyForAudio.current)) {
        void audioContext.current.resume().then(() => {
          if (audioContext.current) playTone(audioContext.current);
        }).catch(() => {});
      }
    } catch {
      setError('Não foi possível carregar as atualizações. Tente novamente.');
      setBusy(false);
    } finally {
      refreshInFlight.current = false;
    }
  }, [muted]);

  const dismissToast = useCallback(() => {
    if (!toast) return;
    setToastLeaving(true);
    if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
    dismissTimer.current = window.setTimeout(() => {
      setToast(null);
      setToastLeaving(false);
      dismissTimer.current = null;
    }, 170);
  }, [toast]);

  useEffect(() => {
    try { setMuted(localStorage.getItem(muteKey) === 'true'); } catch { /* preferência local indisponível */ }
    const initialFetch = window.setTimeout(() => void refresh(false), 0);
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh(true);
    }, 45_000);
    const onVisibility = () => { if (document.visibilityState === 'visible') void refresh(true); };
    const unlock = () => {
      readyForAudio.current = true;
      try {
        const AudioContextType = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextType && !audioContext.current) audioContext.current = new AudioContextType();
        if (audioContext.current?.state === 'suspended') void audioContext.current.resume().catch(() => {});
      } catch { /* navegador pode bloquear ou não oferecer Web Audio */ }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(poll);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', onVisibility);
      if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
    };
  }, [refresh]);

  useEffect(() => () => { if (audioContext.current) void audioContext.current.close().catch(() => {}); }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismissToast, 6_000);
    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); bellRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const markRead = async (id: string) => {
    const before = page;
    setPendingId(id);
    setActionError('');
    setPage(current => markUpdateAsRead(current, id, new Date().toISOString()));
    try {
      await api.patch(`/api/notifications/${id}/read`);
    } catch {
      setPage(before);
      setActionError('Não foi possível atualizar a leitura. Tente novamente.');
    } finally {
      setPendingId(null);
    }
  };

  const toggleMute = () => setMuted(current => {
    const next = !current;
    try { localStorage.setItem(muteKey, String(next)); } catch { /* a preferência vale até o fim da sessão */ }
    return next;
  });

  const openPopover = () => {
    const next = !open;
    setOpen(next);
    if (next) void refresh(false);
  };

  const closeCenter = () => {
    setCenterOpen(false);
    window.setTimeout(() => bellRef.current?.focus(), 0);
  };

  return <div className={`${styles.root} ${styles.bellAnchor}`} ref={rootRef}>
    <button
      ref={bellRef}
      type="button"
      onClick={openPopover}
      className={styles.bellButton}
      aria-label={`Atualizações${page.unread ? `, ${page.unread} não lidas` : ''}`}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-controls={popoverId}
    >
      <Bell size={19} aria-hidden="true" />
      {page.unread > 0 && <span className={styles.countBadge} aria-hidden="true">{page.unread > 99 ? '99+' : page.unread}</span>}
    </button>

    {open && <section id={popoverId} role="dialog" aria-labelledby={`${popoverId}-title`} className={styles.popover}>
      <header className={styles.popoverHeader}>
        <div>
          <h2 id={`${popoverId}-title`} className={styles.popoverTitle}>Atualizações</h2>
          <p className={styles.popoverDescription}>Acompanhe as mudanças recentes do sistema.</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.unreadCount} aria-label={`${page.unread} não lidas`}>{page.unread} não lidas</span>
          <button type="button" onClick={toggleMute} className={styles.iconButton} aria-label={muted ? 'Ativar som das notificações' : 'Silenciar notificações'} title={muted ? 'Ativar som' : 'Silenciar notificações'}>
            {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {actionError && <p role="alert" className={styles.actionError}>{actionError}</p>}
      <div className={styles.updateList} aria-busy={busy}>
        {busy && page.items.length === 0 && <div className={styles.state}><div><LoaderCircle size={20} className="animate-spin" aria-hidden="true" /><p className={styles.stateText}>Carregando atualizações…</p></div></div>}
        {error && <div className={styles.state} role="alert"><div><div className={styles.stateIcon}><AlertTriangle size={19} aria-hidden="true" /></div><p className={styles.stateTitle}>Não foi possível carregar</p><p className={styles.stateText}>{error}</p><button type="button" className={styles.retryButton} onClick={() => void refresh(false)}>Tentar novamente</button></div></div>}
        {!busy && !error && page.items.length === 0 && <div className={styles.state}><div><div className={styles.stateIcon}><CircleCheck size={19} aria-hidden="true" /></div><p className={styles.stateTitle}>Tudo em dia</p><p className={styles.stateText}>Quando houver uma alteração relevante, ela aparecerá aqui.</p></div></div>}
        {!error && page.items.map(item => {
          const highPriority = isHighPriority(item.priority);
          return <article key={item.id} className={`${styles.updateItem} ${item.readAtUtc ? styles.updateRead : styles.updateUnread} ${highPriority ? styles.priorityItem : ''}`}>
            <span className={`${styles.moduleIcon} ${item.readAtUtc ? styles.readIcon : ''}`}><ModuleIcon module={item.module} /></span>
            <div className={styles.itemContent}>
              <p className={styles.itemMessage}>{item.message}</p>
              <div className={styles.itemMeta}>
                <span className={styles.moduleLabel}><ModuleIcon module={item.module} size={13} />{item.module}</span>
                <time className={styles.itemTime} dateTime={item.occurredAtUtc}>{formatUpdateDate(item.occurredAtUtc)}</time>
                <span className={`${styles.statusLabel} ${item.readAtUtc ? styles.statusRead : ''}`}><span className={styles.statusDot} />{item.readAtUtc ? 'Lida' : 'Não lida'}</span>
                {highPriority && <span className={styles.priorityLabel}><AlertTriangle size={12} aria-hidden="true" />Prioridade alta</span>}
              </div>
            </div>
            {!item.readAtUtc && <button type="button" disabled={pendingId === item.id} onClick={() => void markRead(item.id)} className={styles.markButton} aria-label={`Marcar atualização de ${item.module} como lida`} title="Marcar como lida"><Check size={15} aria-hidden="true" /></button>}
          </article>;
        })}
      </div>
      <footer className={styles.popoverFooter}>
        <button type="button" onClick={() => { setOpen(false); setCenterOpen(true); }} className={styles.actionButton}><ExternalLink size={15} aria-hidden="true" />Abrir área de atualizações</button>
      </footer>
    </section>}

    {centerOpen && <UpdatesCenter presentation="modal" onClose={closeCenter} />}

    {toast && <div className={styles.toastRegion}>
      <section role="status" aria-live="polite" className={`${styles.toast} ${toastLeaving ? styles.toastLeaving : ''}`}>
        <span className={styles.toastIcon}><ModuleIcon module={toast.module} size={20} /></span>
        <div>
          <p className={styles.toastTitle}>Nova atualização</p>
          <p className={styles.toastMessage}>{toast.message}</p>
          <p className={styles.toastMeta}>{toast.module} · <time dateTime={toast.occurredAtUtc}>{formatUpdateDate(toast.occurredAtUtc)}</time>{isHighPriority(toast.priority) && <> · Prioridade alta</>}</p>
        </div>
        <button type="button" onClick={dismissToast} className={styles.dismissButton} aria-label="Dispensar aviso"><X size={17} aria-hidden="true" /></button>
      </section>
    </div>}
  </div>;
}

export { findFreshNotificationIds, shouldPlayNotificationSound } from '@/lib/notification-state';
