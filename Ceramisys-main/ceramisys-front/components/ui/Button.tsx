import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'soft' | 'soft-red';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  isLoading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon,
  isLoading,
  className = '',
  ...props 
}: ButtonProps) {

  const baseStyles = "inline-flex items-center justify-center font-bold rounded-lg transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed border";

  const variants = {
    // Ação Principal (Salvar, Registrar)
    primary: "bg-slate-800 text-white border-transparent hover:bg-slate-900 hover:-translate-y-0.5 shadow-md",
    
    // Ação Secundária Antiga (Azul Escuro - mantido por compatibilidade)
    secondary: "bg-blue-600 text-white border-transparent hover:bg-blue-700 hover:-translate-y-0.5",
    
    // Ação Destrutiva
    danger: "bg-red-500 text-white border-transparent hover:bg-red-600 hover:-translate-y-0.5",
    
    // Ação Auxiliar (Limpar, Cancelar)
    outline: "bg-white border-slate-300 text-slate-600 hover:bg-slate-50",
    
    // Sem fundo
    ghost: "bg-transparent text-slate-600 border-transparent hover:bg-slate-100 shadow-none",
    
    // NOVO PADRÃO: Ação Suave (Filtrar, Buscar, Adicionar) - Estilo "Editar"
    soft: "bg-blue-50 text-blue-600 border-transparent hover:bg-blue-100 hover:text-blue-700",
    
    // NOVO PADRÃO: Ação Suave Destrutiva
    "soft-red": "bg-red-50 text-red-600 border-transparent hover:bg-red-100 hover:text-red-700",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></span>
      ) : Icon ? (
        <Icon size={size === 'sm' ? 16 : 20} className={children ? "mr-2" : ""} />
      ) : null}
      {children}
    </button>
  );
}