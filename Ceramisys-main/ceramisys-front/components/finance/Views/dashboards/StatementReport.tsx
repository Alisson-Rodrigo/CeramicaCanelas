import React, { useState, useEffect } from 'react';
import { ScrollText, Filter, Loader2, Wallet, Calendar, Landmark, Coins } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

// --- HELPERS ---
const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Helper para iniciar inputs com a data local correta (YYYY-MM-DD)
const getTodayLocal = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Pega o primeiro dia do mês atual
const getFirstDayOfMonth = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
};

// --- INTERFACES (Baseada no novo JSON) ---
interface StatementResponse {
  startDate: string | null;
  endDate: string | null;
  totalGeneral: number;
  totalsByAccount: Record<string, number>; // Ex: { "Dinheiro": 246, "CXPJ": 1234 }
}

export function StatementReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<StatementResponse | null>(null);

  // Filtros
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getTodayLocal());

  // --- EFEITO INICIAL ---
  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- API ---
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {
        StartDate: startDate,
        EndDate: endDate
      };

      const response = await api.get('/api/extracts/report', { params });
      setReportData(response.data);

    } catch (error) {
      console.error("Erro ao gerar relatório de extratos", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <ScrollText className="text-blue-600"/> Relatório de Extratos
            </h1>
            <p className="text-slate-500">Resumo consolidado de valores por conta/método.</p>
        </div>
      </div>
      
      {/* --- FILTROS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
             <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                    <Calendar size={14}/> Início
                 </label>
                 <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" value={startDate} onChange={e => setStartDate(e.target.value)}/>
             </div>
             <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                    <Calendar size={14}/> Fim
                 </label>
                 <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" value={endDate} onChange={e => setEndDate(e.target.value)}/>
             </div>
             <div>
                 <Button variant="primary" icon={loading ? Loader2 : Filter} onClick={fetchReport} disabled={loading} className="w-full">
                     {loading ? 'GERANDO...' : 'GERAR RELATÓRIO'}
                 </Button>
             </div>
         </div>
      </div>

      {/* --- RESULTADOS --- */}
      {reportData && (
        <div className="animate-fade-in space-y-6">
            
            {/* 1. CARD DE TOTAL GERAL */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg p-6 text-white flex items-center justify-between">
                <div>
                    <p className="text-blue-100 text-sm font-medium mb-1 uppercase tracking-wide">Total Geral do Período</p>
                    <h2 className="text-4xl font-extrabold">{formatMoney(reportData.totalGeneral)}</h2>
                </div>
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                    <Landmark size={40} className="text-white"/>
                </div>
            </div>

            {/* 2. GRID DE CONTAS (TOTAL POR CONTA) */}
            <div>
                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Wallet className="text-slate-500"/> Detalhamento por Conta
                </h3>
                
                {Object.keys(reportData.totalsByAccount).length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-xl text-slate-400">
                        Nenhum registro encontrado neste período.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Itera sobre o objeto totalsByAccount */}
                        {Object.entries(reportData.totalsByAccount).map(([accountName, value], idx) => (
                            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="font-bold text-slate-700 text-sm bg-slate-100 px-2 py-1 rounded-lg">
                                        {accountName}
                                    </span>
                                    <Coins className="text-slate-300" size={20}/>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium uppercase">Total</span>
                                    <p className={`text-2xl font-bold ${value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatMoney(value)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
      )}

    </div>
  );
}
