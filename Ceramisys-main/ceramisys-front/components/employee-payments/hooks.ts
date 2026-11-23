'use client';
import { useEffect, useRef, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { employeeError } from '@/lib/employee-payments';

export function useEmployeeQuery<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>) {
  const loader = useRef(load);
  useEffect(() => { loader.current = load; });
  const [state, setState] = useState<{ key: string | null; data?: T; error: string; loading: boolean }>({ key: null, error: '', loading: false });
  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    void loader.current(controller.signal).then(data => { if (!controller.signal.aborted) setState({ key, data, error: '', loading: false }); })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: employeeError(error) ?? getApiErrorMessage(error), loading: false }); });
    return () => controller.abort();
  }, [key]);
  return { data: state.key === key ? state.data : undefined, error: state.key === key ? state.error : '', loading: key !== null && state.key !== key };
}
export function useEmployeeMutation(onChanged: () => void) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const run = async (action: () => Promise<unknown>, success = 'Operação concluída.', financial = false) => {
    if (lock.current || uncertain) return false;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); setMessage(success); onChanged(); return true; }
    catch (e) {
      const response = (e as { response?: { status: number }; isAxiosError?: boolean });
      const unknown = financial && !!response.isAxiosError && (!response.response || response.response.status >= 500 || response.response.status === 408);
      setUncertain(unknown);
      setError((employeeError(e) ?? getApiErrorMessage(e)) + (unknown ? ' O resultado pode ter sido gravado. Consulte o estado antes de repetir.' : ''));
      onChanged(); return false;
    } finally { lock.current = false; setBusy(false); }
  };
  const reconcile = async (check: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await check(); setUncertain(false); setError(''); setMessage('Estado consultado. Confira os registros antes de continuar.'); onChanged(); }
    catch (e) { setError(employeeError(e) ?? getApiErrorMessage(e)); }
    finally { lock.current = false; setBusy(false); }
  };
  return { busy, message, error, uncertain, run, reconcile };
}
