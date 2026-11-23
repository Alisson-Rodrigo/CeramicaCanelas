import React from 'react';
import { Edit, Trash2, Eye } from 'lucide-react';

interface TableActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'edit' | 'delete' | 'view';
}

export function TableAction({ variant, ...props }: TableActionProps) {
  const configs = {
    edit: { icon: Edit, style: "text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700", title: "Editar" },
    delete: { icon: Trash2, style: "text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700", title: "Excluir" },
    view: { icon: Eye, style: "text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-800", title: "Ver Detalhes" }
  };

  const { icon: Icon, style, title } = configs[variant];

  return (
    <button 
      className={`p-2 rounded-lg transition-colors duration-200 ${style}`}
      title={title}
      type="button"
      {...props}
    >
      <Icon size={16} />
    </button>
  );
}