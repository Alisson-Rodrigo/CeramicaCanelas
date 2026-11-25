import type { Ref } from 'react';
import { Factory, Flame, LogOut, X } from 'lucide-react';

interface KilnSidebarProps {
  collapsed: boolean;
  closeRef: Ref<HTMLButtonElement>;
  onCloseMobile: () => void;
  onBackToMain: () => void;
}

export function KilnSidebar({ collapsed, closeRef, onCloseMobile, onBackToMain }: KilnSidebarProps) {
  return (
    <>
      <div className={`flex shrink-0 items-center justify-between border-b border-gray-100 p-6 ${collapsed ? 'md:justify-center md:p-4' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-800">
            <Factory size={18} aria-hidden="true" />
          </span>
          <span className={`text-lg font-bold text-gray-800 ${collapsed ? 'md:hidden' : ''}`}>Produção</span>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onCloseMobile}
          aria-label="Fechar menu da Produção"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Menu da Produção" className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <button
          type="button"
          aria-current="page"
          aria-label="Controle de Fornos"
          title={collapsed ? 'Controle de Fornos' : undefined}
          onClick={onCloseMobile}
          className={`flex w-full items-center gap-3 rounded-lg bg-orange-50 px-4 py-2.5 text-left text-sm font-semibold text-orange-800 ${collapsed ? 'md:justify-center md:px-2' : ''}`}
        >
          <Flame size={18} className="shrink-0" aria-hidden="true" />
          <span className={collapsed ? 'md:hidden' : undefined}>Controle de Fornos</span>
        </button>
      </nav>

      <div className="shrink-0 border-t border-gray-100 p-4">
        <button
          type="button"
          aria-label="Sair do Módulo"
          title={collapsed ? 'Sair do Módulo' : undefined}
          onClick={onBackToMain}
          className={`flex w-full items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 ${collapsed ? 'md:px-2' : ''}`}
        >
          <LogOut size={18} className="shrink-0 rotate-180" aria-hidden="true" />
          <span className={collapsed ? 'md:hidden' : undefined}>Sair do Módulo</span>
        </button>
      </div>
    </>
  );
}
