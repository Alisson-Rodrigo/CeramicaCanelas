import React from 'react';
import { FileBarChart, Filter, X, Printer, ArrowDownCircle, ArrowUpCircle, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface FinancialReportsProps {
    type: 'cash-flow' | 'out' | 'in' | 'verification';
}

export function FinancialReports({ type }: FinancialReportsProps) {
  const titles = {
      'cash-flow': 'Movimento de Caixa',
      'out': 'Balancete de Saídas',
      'in': 'Balancete de Entradas',
      'verification': 'Balancete de Verificação'
  };

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileBarChart className="text-slate-600"/> {titles[type]}</h1></div></div>
      
      {/* FILTROS PADRONIZADOS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data Inicial</label><input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-slate-600" /></div>
              <div className="md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data Final</label><input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-slate-600" /></div>
              <div className="md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Conta/Caixa</label><select className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none"><option>Todas</option><option>Caixa Principal</option><option>Banco do Brasil</option></select></div>
              <div className="flex gap-2"><Button variant="soft" icon={Filter} className="w-full">GERAR</Button><Button variant="outline" icon={Printer}>IMPRIMIR</Button></div>
           </div>
      </div>

      {/* RESULTADO (Placeholder Visual) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 flex flex-col items-center justify-center text-slate-400 h-96">
          <BarChart3 size={64} className="mb-4 text-slate-200"/>
          <p className="text-lg font-medium">Selecione o período acima para gerar o relatório.</p>
      </div>
    </div>
  );
}
