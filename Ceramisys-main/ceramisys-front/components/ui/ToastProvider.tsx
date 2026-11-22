'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

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
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

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
    setToasts((current) => [...current.slice(-3), { id, message, type: identifyToastType(message) }]);

    const timer = setTimeout(() => removeToast(id), 4500);
    timers.current.set(id, timer);
  }, [removeToast]);

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = showToast;

    const activeTimers = timers.current;
    return () => {
      window.alert = originalAlert;
      activeTimers.forEach(clearTimeout);
      activeTimers.clear();
    };
  }, [showToast]);

  return (
    <>
      {children}

      <div
        className="fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const style = toastStyles[toast.type];
          const Icon = style.icon;

          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-sm ${style.className}`}
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{style.title}</p>
                <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-5">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-md p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
                aria-label="Fechar notificação"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
