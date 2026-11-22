'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { z } from 'zod';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

type FormErrors = {
  [key: string]: string | null | undefined;
};

const resetSchema = z.object({
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirme sua nova senha"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => router.push('/auth/login'), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

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

    const result = resetSchema.safeParse(form);

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
      await api.post(
        `/api/auth/validation-reset?Token=${encodeURIComponent(token!)}&Password=${encodeURIComponent(form.password)}&ConfirmPassword=${encodeURIComponent(form.confirmPassword)}`
      );
      setSuccess(true);
    } catch (err: unknown) {
      setApiError(getApiErrorMessage(err, 'Não foi possível redefinir a senha. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  // Token ausente na URL
  if (!token) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2 bg-white overflow-hidden font-sans">
        <style>{`
          @keyframes morph {
            0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: translate(0, 0) rotate(0deg); }
            50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; transform: translate(10px, -10px) rotate(5deg); }
          }
        `}</style>
        <div className="hidden lg:flex relative items-center justify-center p-16 bg-[#fff7ed] overflow-hidden border-r border-orange-100">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[15%] left-[10%] w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-60" style={{ animation: 'morph 8s ease-in-out infinite' }}></div>
            <div className="absolute bottom-[15%] right-[10%] w-80 h-80 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-60" style={{ animation: 'morph 8s ease-in-out infinite', animationDelay: '2s' }}></div>
          </div>
          <div className="relative z-10 text-center">
            <div className="w-32 h-32 mx-auto mb-10 relative">
              <Image src="/icons/logo.png" alt="Logo CeramiSys" fill className="object-contain" priority />
            </div>
            <h1 className="text-5xl font-black text-gray-900 mb-6 tracking-tight">
              Cerami<span className="text-orange-600">Sys</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center justify-center p-4 sm:p-8 lg:p-16 bg-white">
          <div className="w-full max-w-[480px] text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 border-2 border-red-100 mb-8">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Link inválido</h2>
            <p className="text-gray-500 text-lg mb-8">Este link de recuperação é inválido ou já expirou.</p>
            <Link
              href="/auth/forgot-password"
              className="inline-flex items-center gap-2 py-4 px-8 text-base font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all duration-200"
            >
              Solicitar novo link
            </Link>
          </div>
        </div>
      </div>
    );
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
            Crie uma senha forte para proteger o acesso à sua indústria.
          </p>
          <div className="mt-6 flex flex-col gap-3 items-center justify-center opacity-80">
            <div className="flex items-center gap-2 text-gray-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              Mínimo 6 caracteres
            </div>
            <div className="flex items-center gap-2 text-gray-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              Use letras e números
            </div>
          </div>
        </div>
      </div>

      {/* LADO DIREITO */}
      <div className="flex items-center justify-center p-4 sm:p-8 lg:p-16 bg-white">
        <div className="w-full max-w-[480px]">

          {!success ? (
            <>
              <div className="mb-8 text-center lg:text-left">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-orange-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
                  </svg>
                </div>
                <h2 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">Nova senha</h2>
                <p className="text-gray-500 text-lg leading-relaxed">
                  Escolha uma senha segura para sua conta.
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

                {/* Nova senha */}
                <div>
                  <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Mínimo 6 caracteres"
                      className={`w-full px-5 py-4 text-base border-2 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 transition-all duration-200 placeholder:text-gray-400 text-gray-900 pr-12
                        ${errors.password
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                          : 'border-gray-200 focus:border-orange-500 focus:ring-orange-500/10'}`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1">
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 ml-1 text-sm text-red-500 font-medium">{errors.password}</p>}
                </div>

                {/* Confirmar senha */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                    Confirmar nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      id="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Repita a senha"
                      className={`w-full px-5 py-4 text-base border-2 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 transition-all duration-200 placeholder:text-gray-400 text-gray-900 pr-12
                        ${errors.confirmPassword
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                          : 'border-gray-200 focus:border-orange-500 focus:ring-orange-500/10'}`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1">
                      {showConfirm ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1 ml-1 text-sm text-red-500 font-medium">{errors.confirmPassword}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 text-lg font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-orange-200 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-2"
                >
                  {loading ? 'Salvando senha...' : 'Salvar nova senha'}
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Senha redefinida!</h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-2">
                Sua senha foi alterada com sucesso.
              </p>
              <p className="text-sm text-gray-400 mb-10">
                Você será redirecionado para o login em instantes...
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 py-4 px-8 text-base font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all duration-200"
              >
                Ir para o Login agora
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ✅ Página exportada com Suspense envolvendo o componente que usa useSearchParams
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
