'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Loader2, UserRound } from 'lucide-react';
import localFont from 'next/font/local';
import { LoginBrandPanel } from '@/components/auth/LoginBrandPanel';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import styles from '@/components/auth/login.module.css';
import { z } from 'zod';

const loginFont = localFont({ src: './fonts/geist-latin.woff2', display: 'swap', weight: '100 900' });

type FormErrors = {
  [key: string]: string | null | undefined;
};

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Informe seu usuário.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

function getLoginErrorMessage(status: number, serverMessage?: string) {
  if (serverMessage) return serverMessage;
  if (status === 400 || status === 401) return 'Usuário ou senha inválidos. Verifique os dados e tente novamente.';
  if (status === 403) return 'Seu acesso está bloqueado ou inativo. Procure um administrador.';
  if (status === 429) return 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.';
  if (status >= 500) return 'O serviço de login está temporariamente indisponível.';
  return 'Não foi possível entrar. Tente novamente.';
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState("");

  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));

    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: null }));
    if (generalError) setGeneralError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setGeneralError("");

    const result = loginSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const fieldName = String(issue.path[0]);
        fieldErrors[fieldName] = issue.message;
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
        }),
      });

      if (response.ok) {
        // Faz uma navegação completa para carregar o dashboard com o cookie novo.
        window.location.assign('/dashboard');
      } else {
        const errorData = await response.json().catch(() => null) as { message?: string } | null;
        setGeneralError(getLoginErrorMessage(response.status, errorData?.message));
        setLoading(false);
      }
    } catch {
      setGeneralError('Não foi possível conectar ao sistema. Verifique sua conexão e tente novamente.');
      setLoading(false);
    }
  }

  return (
    <main className={styles.page + ' ' + loginFont.className + ' app-page-enter'}>
      <LoginBrandPanel />
      <section className={styles.formPanel} aria-labelledby="login-form-title">
        <div className={styles.themeControl}><ThemeToggle /></div>
        <svg className={styles.backgroundGeometry} viewBox="0 0 822 941" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <path d="M625-35l-62 85q-19 33 13 33h116q18 0 30-17l67-93M835 0h-18q-15 0-26 14L653 202q-16 23 12 23h170M-20 706H93q29 0 14 28L-21 907M-10 955l60-78q12-17 33-17h77q30 0 17 27l-48 68" stroke="currentColor" strokeWidth="2.5" />
        </svg>
        <div className={styles.mobileIdentity}>
          <div className={styles.brandMark}><Image src="/icons/logo.png" alt="" width={80} height={80} /></div>
          <span>Cerâmica Canelas</span>
        </div>
        <div className={styles.card}>
          <header className={styles.formHeading}>
            <div className={styles.lockTile}><LockKeyhole aria-hidden="true" /></div>
            <h1 id="login-form-title">Acesse o sistema</h1>
            <p>Informe suas credenciais para continuar.</p>
          </header>
          {generalError && (
            <div role="alert" className={styles.error}>
              <AlertCircle size={20} aria-hidden="true" />
              <div><strong>Não foi possível entrar</strong><p>{generalError}</p></div>
            </div>
          )}
          <form onSubmit={handleSubmit} className={styles.form} aria-busy={loading} noValidate>
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="username"><UserRound aria-hidden="true" />Nome de usuário</label>
              </div>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={form.username}
                onChange={handleChange}
                className={styles.input}
                aria-invalid={Boolean(errors.username)}
                aria-describedby={errors.username ? 'username-error' : undefined}
              />
              {errors.username && <p id="username-error" role="alert" className={styles.fieldError}>{errors.username}</p>}
            </div>
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="password"><LockKeyhole aria-hidden="true" />Senha</label>
                <Link href="/auth/forgot-password">Esqueceu a senha?</Link>
              </div>
              <div className={styles.inputWrap}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  className={styles.input + ' ' + styles.passwordInput}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.passwordToggle} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} aria-controls="password">
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
              {errors.password && <p id="password-error" role="alert" className={styles.fieldError}>{errors.password}</p>}
            </div>
            <button type="submit" disabled={loading} className={styles.submit}>
              {loading ? <><Loader2 className={styles.spinner} aria-hidden="true" /><span role="status">Acessando...</span></> : <><span>Entrar no Sistema</span><ArrowRight aria-hidden="true" /></>}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
