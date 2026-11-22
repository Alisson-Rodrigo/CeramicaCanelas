'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface UnauthorizedScreenProps {
  onBack: () => void; // Função para voltar ao dashboard
}

export function UnauthorizedScreen({ onBack }: UnauthorizedScreenProps) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Contador regressivo
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    // Redireciona quando chegar a 0
    if (countdown === 0) {
      onBack();
    }

    return () => clearInterval(timer);
  }, [countdown, onBack]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] animate-fade-in p-6 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-red-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
        <div className="bg-red-50 p-6 rounded-full relative z-10 border border-red-100 shadow-sm">
          <ShieldAlert size={64} className="text-red-500" />
        </div>
      </div>

      <h2 className="text-3xl font-bold text-slate-800 mb-2">Acesso Negado</h2>
      <p className="text-slate-500 max-w-md mb-8 text-lg">
        Seu perfil de usuário não tem permissão para acessar este módulo.
        Entre em contato com o administrador se achar que isso é um erro.
      </p>

      <div className="bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
        <span className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-2">
          Redirecionando em
        </span>
        <span className="text-4xl font-black text-slate-800 font-mono">
          {countdown}s
        </span>
      </div>

      <button 
        onClick={onBack}
        className="mt-8 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"
      >
        <ArrowLeft size={20} /> Voltar agora
      </button>
    </div>
  );
}