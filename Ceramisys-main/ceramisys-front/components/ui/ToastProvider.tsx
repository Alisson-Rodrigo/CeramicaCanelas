'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AudioLines, CheckCircle2, Info, TriangleAlert, VolumeX, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

const subscribeToClient = () => () => {};

const toastStyles: Record<ToastType, { icon: typeof Info; className: string; title: string }> = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    title: 'Sucesso',
  },
  error: {
    icon: AlertCircle,
    className: 'border-red-200 bg-red-50 text-red-800',
    title: 'Erro',
  },
  warning: {
    icon: TriangleAlert,
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    title: 'Atenção',
  },
  info: {
    icon: Info,
    className: 'border-blue-200 bg-blue-50 text-blue-800',
    title: 'Informação',
  },
};

function identifyToastType(message: string): ToastType {
  const normalized = message.toLocaleLowerCase('pt-BR');

  if (/erro|falha|incorret|não foi possível|não encontrado|não autorizad|insuficiente|não é possível|já existe|expirad|já utilizad|não conferem/.test(normalized)) return 'error';
  if (/sucesso|cadastrad|atualizad|registrad|excluíd|cancelad|realizad|salv[oa]/.test(normalized)) return 'success';
  if (/obrigatóri|inválid|preencha|selecione|informe|não pode|não coincidem/.test(normalized)) return 'warning';

  return 'info';
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const portalReady = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    try { return typeof window === 'undefined' || window.localStorage.getItem('ceramica-sounds') !== 'off'; }
    catch { return true; }
  });
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const audioContext = useRef<AudioContext | null>(null);
  const soundPreference = useRef(soundsEnabled);

  const playSound = useCallback((kind: 'click' | 'success' | 'error') => {
    if (!soundPreference.current || typeof window === 'undefined') return;
    try {
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) return;
      const context = audioContext.current ?? (audioContext.current = new AudioContextConstructor());
      if (context.state === 'suspended') void context.resume();
      const now = context.currentTime;
      const notes = kind === 'success' ? [660, 880] : kind === 'error' ? [330, 220] : [740];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const startAt = now + index * (kind === 'click' ? 0 : 0.09);
        const duration = kind === 'click' ? 0.035 : 0.11;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(kind === 'click' ? 0.035 : 0.055, startAt + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + duration + 0.01);
      });
    } catch {
      // O sistema permanece utilizável caso o navegador bloqueie áudio.
    }
  }, []);

  const removeToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((value?: unknown) => {
    const message = String(value ?? '');
    if (!message) return;

    const id = ++nextId.current;
    const type = identifyToastType(message);
    setToasts((current) => [...current.slice(-3), { id, message, type }]);
    if (type === 'success' || type === 'error') playSound(type);

    const timer = setTimeout(() => removeToast(id), 4500);
    timers.current.set(id, timer);
  }, [playSound, removeToast]);

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = showToast;

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('[data-sound-control]')) return;
      const action = target.closest('button, a, [role="button"], [data-ui-sound]');
      if (action && !(action instanceof HTMLButtonElement && action.disabled)) playSound('click');
    };
    const handleInvalid = () => playSound('error');
    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      window.setTimeout(() => {
        if (form.querySelector('[aria-invalid="true"], [role="alert"]')) playSound('error');
      }, 0);
    };
    document.addEventListener('click', handleClick, true);
    document.addEventListener('invalid', handleInvalid, true);
    document.addEventListener('submit', handleSubmit, true);

    const activeTimers = timers.current;
    return () => {
      window.alert = originalAlert;
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('invalid', handleInvalid, true);
      document.removeEventListener('submit', handleSubmit, true);
      activeTimers.forEach(clearTimeout);
      activeTimers.clear();
      void audioContext.current?.close();
      audioContext.current = null;
    };
  }, [playSound, showToast]);

  const toggleSounds = () => {
    const enabled = !soundPreference.current;
    soundPreference.current = enabled;
    setSoundsEnabled(enabled);
    try { window.localStorage.setItem('ceramica-sounds', enabled ? 'on' : 'off'); } catch { /* segue nesta sessão */ }
    if (enabled) playSound('success');
  };

  return (
    <>
      {children}
      {portalReady && createPortal(
        <div className="toast-region" aria-live="polite" aria-atomic="false">
          {toasts.length > 0 && (
            <div className="toast-toolbar">
              <span>Avisos do sistema</span>
              <button type="button" data-sound-control onClick={toggleSounds} aria-label={soundsEnabled ? 'Desativar sons do sistema' : 'Ativar sons do sistema'} aria-pressed={soundsEnabled}>
                {soundsEnabled ? <AudioLines className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
                <span>{soundsEnabled ? 'Sons ligados' : 'Sons desligados'}</span>
              </button>
            </div>
          )}
          {toasts.map((toast) => {
            const style = toastStyles[toast.type];
            const Icon = style.icon;
            return (
              <div key={toast.id} role={toast.type === 'error' ? 'alert' : 'status'} className={`toast-card ${style.className}`}>
                <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1"><p className="text-sm font-bold">{style.title}</p><p className="mt-0.5 whitespace-pre-line break-words text-sm leading-5">{toast.message}</p></div>
                <button type="button" onClick={() => removeToast(toast.id)} className="rounded-md p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100" aria-label="Fechar notificação"><X className="size-4" /></button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
