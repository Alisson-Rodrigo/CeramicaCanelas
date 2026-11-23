import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, Filter, PieChart, Download, Loader2, Calendar, Search, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- HELPERS ---
const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Helper para pegar datas do mês atual
const getCurrentMonthDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
    };
};

// --- INTERFACES ---
interface BalanceInItem {
  paymentMethod: string; // O JSON retorna o nome (ex: "Dinheiro")
  totalIncome: number;
}

interface BalanceInResponse {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  totalIncomeOverall: number;
  startDate: string;
  endDate: string;
  items: BalanceInItem[];
}

export function BalanceInReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<BalanceInResponse | null>(null);

  // Filtros
  const { start, end } = getCurrentMonthDates();
  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(end);
  const [search, setSearch] = useState('');

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
        Page: 1,
        PageSize: 50,
        StartDate: startDate,
        EndDate: endDate,
        Search: search || undefined
      };

      const response = await api.get('/api/financial/dashboard-financial/balance-income', { params });
      setReportData(response.data);

    } catch (error) {
      console.error("Erro ao gerar balancete de entradas", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    try {
        const params = { StartDate: startDate, EndDate: endDate, Search: search };
        const response = await api.get('/api/financial/dashboard-financial/balance-income/pdf', { 
            params, responseType: 'blob' 
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `balancete_entradas_${startDate}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        alert(getApiErrorMessage(error, 'Não foi possível exportar o PDF.'));
    }
  };

  // Calcula a porcentagem para a barra de progresso
  const calculatePercentage = (val: number, total: number) => {
      if (!total || total === 0) return 0;
      return Math.round((val / total) * 100);
  };

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <ArrowUpCircle className="text-emerald-600"/> Balancete de Entradas
            </h1>
            <p className="text-slate-500">Análise de receitas por método de pagamento.</p>
        </div>
      </div>
      
      {/* --- FILTROS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Buscar</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg outline-none text-sm" 
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Ex: Dinheiro..."
                    />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">De</label>
                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" value={startDate} onChange={e => setStartDate(e.target.value)}/>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Até</label>
                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" value={endDate} onChange={e => setEndDate(e.target.value)}/>
            </div>
            <Button variant="primary" icon={loading ? Loader2 : Filter} onClick={fetchReport} disabled={loading}>
                {loading ? 'GERANDO...' : 'GERAR RELATÓRIO'}
            </Button>
         </div>
      </div>

      {/* --- CONTEÚDO DO RELATÓRIO --- */}
      {reportData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            
            {/* COLUNA ESQUERDA: TOTALIZADOR */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="p-4 bg-white rounded-full text-emerald-500 shadow mb-4">
                        <ArrowUpCircle size={32}/>
                    </div>
                    <p className="text-sm font-bold text-emerald-700 uppercase tracking-wide">Receita Total do Período</p>
                    <h2 className="text-4xl font-extrabold text-emerald-800 mt-2">{formatMoney(reportData.totalIncomeOverall)}</h2>
                    <p className="text-xs text-emerald-600 mt-2">
                        {new Date(reportData.startDate).toLocaleDateString()} até {new Date(reportData.endDate).toLocaleDateString()}
                    </p>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Wallet size={18}/> Origem das Receitas</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Métodos Identificados:</span>
                            <span className="font-bold text-slate-800">{reportData.totalItems}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1 rounded-full"></div>
                        <p className="text-xs text-slate-400 text-center">
                            Este valor representa a soma de todas as entradas agrupadas por forma de pagamento.
                        </p>
                    </div>
                </div>
            </div>

            {/* COLUNA DIREITA: LISTA DE MÉTODOS */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">Detalhamento por Meio de Pagamento</h3>
                    </div>
                    
                    {reportData.items.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 italic">Nenhuma receita encontrada neste período.</div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {reportData.items.map((item, index) => {
                                const percent = calculatePercentage(item.totalIncome, reportData.totalIncomeOverall);
                                return (
                                    <div key={index} className="p-4 hover:bg-slate-50 transition-colors group">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-slate-700 flex items-center gap-2">
                                                {item.paymentMethod || 'Não Identificado'}
                                            </span>
                                            <span className="font-bold text-emerald-600">{formatMoney(item.totalIncome)}</span>
                                        </div>
                                        
                                        {/* Barra de Progresso Visual */}
                                        <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all duration-500"
                                                style={{ width: `${percent}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-right mt-1">
                                            <span className="text-[10px] font-bold text-slate-400">{percent}% do total</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

        </div>
      )}

    </div>
  );
}
