'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { z } from 'zod';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

type FormErrors = {
  [key: string]: string | null | undefined;
};

const forgotSchema = z.object({
  email: z.string().email("Digite um e-mail válido"),
});

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ email: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: null }));
    if (apiError) setApiError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setApiError(null);

    const result = forgotSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    try {
      await api.post(`/api/auth/forgot-password?email=${encodeURIComponent(form.email)}`);
      setSent(true);
    } catch (err: unknown) {
      setApiError(getApiErrorMessage(err, 'Não foi possível enviar o e-mail. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white overflow-hidden font-sans">

      <style>{`
        @keyframes morph {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: translate(0, 0) rotate(0deg); }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; transform: translate(10px, -10px) rotate(5deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
      `}</style>

      {/* LADO ESQUERDO */}
      <div className="hidden lg:flex relative items-center justify-center p-16 bg-[#fff7ed] overflow-hidden border-r border-orange-100">
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <div className="absolute top-[15%] left-[10%] w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-60" style={{ animation: 'morph 8s ease-in-out infinite' }}></div>
          <div className="absolute bottom-[15%] right-[10%] w-80 h-80 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-60" style={{ animation: 'morph 8s ease-in-out infinite', animationDelay: '2s' }}></div>
          <div className="absolute top-[40%] left-[30%] w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50" style={{ animation: 'morph 8s ease-in-out infinite', animationDelay: '4s' }}></div>
        </div>

        <div className="relative z-10 text-center" style={{ animation: 'float 6s ease-in-out infinite' }}>
          <div className="w-32 h-32 mx-auto mb-10 relative">
            <Image src="/icons/logo.png" alt="Logo CeramiSys" fill className="object-contain" priority />
          </div>
          <h1 className="text-5xl font-black text-gray-900 mb-6 tracking-tight">
            Cerami<span className="text-orange-600">Sys</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-md mx-auto leading-relaxed font-medium">
            Recupere seu acesso e volte a gerenciar sua indústria.
          </p>
          <div className="mt-6 flex flex-col gap-3 items-center justify-center opacity-80">
            <div className="flex items-center gap-2 text-gray-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              Processo seguro e rápido
            </div>
            <div className="flex items-center gap-2 text-gray-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              Link enviado por e-mail
            </div>
          </div>
        </div>
      </div>

      {/* LADO DIREITO */}
      <div className="flex items-center justify-center p-4 sm:p-8 lg:p-16 bg-white">
        <div className="w-full max-w-[480px]">

          {!sent ? (
            <>
              <div className="mb-8 text-center lg:text-left">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-orange-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <h2 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">Esqueceu a senha?</h2>
                <p className="text-gray-500 text-lg leading-relaxed">
                  Sem problemas. Digite seu e-mail e enviaremos um link para criar uma nova senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">

                {apiError && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-500 mt-0.5 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <p className="text-sm text-red-600 font-medium">{apiError}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                    E-mail cadastrado
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="admin@ceramica.com"
                    className={`w-full px-5 py-4 text-base border-2 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 transition-all duration-200 placeholder:text-gray-400 text-gray-900
                      ${errors.email
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                        : 'border-gray-200 focus:border-orange-500 focus:ring-orange-500/10'}`}
                  />
                  {errors.email && <p className="mt-1 ml-1 text-sm text-red-500 font-medium">{errors.email}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 text-lg font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-orange-200 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-2"
                >
                  {loading ? 'Enviando link...' : 'Enviar link de recuperação'}
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 text-sm text-gray-400 bg-white font-medium">Lembrou a senha?</span>
                  </div>
                </div>

                <p className="text-center text-base text-gray-600">
                  <Link href="/auth/login" className="font-bold text-orange-600 hover:text-orange-700 transition-colors">
                    Voltar para o Login
                  </Link>
                </p>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 border-2 border-green-100 mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-green-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">E-mail enviado!</h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-2">
                Enviamos um link de recuperação para
              </p>
              <p className="font-bold text-orange-600 text-lg mb-8">{form.email}</p>
              <p className="text-sm text-gray-400 mb-10 leading-relaxed">
                Verifique sua caixa de entrada e spam. O link expira em{' '}
                <span className="font-semibold text-gray-600">30 minutos</span>.
              </p>
              <Link href="/auth/login" className="inline-flex items-center gap-2 font-bold text-orange-600 hover:text-orange-700 transition-colors text-base">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Voltar para o Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
