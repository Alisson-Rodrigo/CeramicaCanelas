'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, LockKeyhole, Mail, Send } from 'lucide-react';
import localFont from 'next/font/local';
import { z } from 'zod';
import { getApiErrorMessage } from '@/lib/api-error';
import { LoginBrandPanel } from '@/components/auth/LoginBrandPanel';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import styles from '@/components/auth/login.module.css';

const pageFont = localFont({ src: '../login/fonts/geist-latin.woff2', display: 'swap', weight: '100 900' });
const forgotSchema = z.object({ email: z.string().trim().email('Digite um e-mail válido.') });

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFieldError('');
    const result = forgotSchema.safeParse({ email });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? 'Confira o e-mail informado.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: result.data.email }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(payload?.message ?? 'Não foi possível enviar o e-mail. Tente novamente.');
      }
      setEmail(result.data.email);
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : getApiErrorMessage(requestError, 'Não foi possível enviar o e-mail. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`${styles.page} ${pageFont.className} app-page-enter`}>
      <LoginBrandPanel />
      <section className={styles.formPanel} aria-labelledby="forgot-password-title">
        <div className={styles.themeControl}><ThemeToggle /></div>
        <svg className={styles.backgroundGeometry} viewBox="0 0 822 941" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <path d="M625-35l-62 85q-19 33 13 33h116q18 0 30-17l67-93M835 0h-18q-15 0-26 14L653 202q-16 23 12 23h170M-20 706H93q29 0 14 28L-21 907M-10 955l60-78q12-17 33-17h77q30 0 17 27l-48 68" stroke="currentColor" strokeWidth="2.5" />
        </svg>
        <div className={styles.mobileIdentity}>
          <div className={styles.brandMark}><Image src="/icons/logo.png" alt="" width={80} height={80} /></div>
          <span>Cerâmica Canelas</span>
        </div>

        <div className={styles.card}>
          {!sent ? (
            <>
              <header className={styles.formHeading}>
                <div className={styles.lockTile}><Mail aria-hidden="true" /></div>
                <h1 id="forgot-password-title">Esqueceu a senha?</h1>
                <p>Informe seu e-mail cadastrado para receber um link seguro de redefinição.</p>
              </header>
              {error && <div role="alert" className={styles.error}><AlertCircle size={20} aria-hidden="true" /><div><strong>Não foi possível enviar o link</strong><p>{error}</p></div></div>}
              <form onSubmit={handleSubmit} className={styles.form} aria-busy={loading} noValidate>
                <div className={styles.field}>
                  <div className={styles.labelRow}><label htmlFor="email"><Mail aria-hidden="true" />E-mail cadastrado</label></div>
                  <input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => { setEmail(event.target.value); setFieldError(''); setError(''); }} className={styles.input} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? 'email-error' : undefined} />
                  {fieldError && <p id="email-error" role="alert" className={styles.fieldError}>{fieldError}</p>}
                </div>
                <button type="submit" disabled={loading} className={styles.submit}>
                  {loading ? <><Loader2 className={styles.spinner} aria-hidden="true" /><span role="status">Enviando link...</span></> : <><span>Enviar link de recuperação</span><Send aria-hidden="true" /></>}
                </button>
                <p className={styles.backLink}><Link href="/auth/login"><ArrowLeft aria-hidden="true" />Voltar para o login</Link></p>
              </form>
            </>
          ) : (
            <div className={styles.successState} role="status">
              <div className={styles.successIcon}><CheckCircle2 aria-hidden="true" /></div>
              <h1 id="forgot-password-title">Confira seu e-mail</h1>
              <p>Se <strong>{email}</strong> estiver cadastrado, enviaremos um link para redefinir sua senha.</p>
              <p className={styles.expiration}>Por segurança, o link expira em 30 minutos.</p>
              <button type="button" className={styles.resend} onClick={() => setSent(false)}><Mail aria-hidden="true" />Enviar novamente</button>
              <p className={styles.backLink}><Link href="/auth/login"><ArrowLeft aria-hidden="true" />Voltar para o login</Link></p>
            </div>
          )}
        </div>
        <p className={styles.securityNote}><LockKeyhole aria-hidden="true" />Sua solicitação é protegida e confidencial.</p>
      </section>
    </main>
  );
}
