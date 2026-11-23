import React, { useState, useEffect } from 'react';
// 1. Adicionado ChevronLeft e ChevronRight aos imports
import { 
  BarChart3, Filter, Search, Download, Loader2, ArrowUpCircle, 
  ArrowDownCircle, Wallet, Users, Tags, X, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- ENUMS E HELPERS ---
const PaymentMethodDescriptions: Record<number, string> = {
  0: "Dinheiro", 1: "CXPJ", 2: "BBJ", 3: "BBJN", 4: "CHEQUE", 5: "BradescoPJ", 6: "CXJ", 7: "Débito Automático"
};

const LaunchTypeDescriptions: Record<number, string> = {
  1: "Entrada",
  2: "Saída"
};

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';

  const dateOnly = dateStr.split('T')[0]; // garante só yyyy-MM-dd
  const [year, month, day] = dateOnly.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
};
const getCurrentMonthDates = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start: formatDate(firstDay.toISOString().split('T')[0]), // Conversão de Date para string
    end: formatDate(lastDay.toISOString().split('T')[0]),   // Conversão de Date para string
  };
};
// --- INTERFACES ---
interface CashFlowItem {
  launchDate: string;
  description: string;
  amount: number;
  type: number; // 1 ou 2
  categoryName: string;
  customerName: string;
  paymentMethod: string;
}

interface CashFlowResponse {
  totalEntradas: number;
  totalSaidas: number;
  saldo: number;
  items: CashFlowItem[];
  totalItems: number;
  page: number;
  totalPages: number;
}

export function CashFlowReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<CashFlowResponse | null>(null);

  // Datas
  const { start, end } = getCurrentMonthDates();
  const [startDate, setStartDate] = useState(start); 
  const [endDate, setEndDate] = useState(end);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState(''); 
  const [searchCategoryOrCustomer, setSearchCategoryOrCustomer] = useState(''); 
  const [paymentMethod, setPaymentMethod] = useState('');
  const [launchType, setLaunchType] = useState(''); 
  
  // Paginação
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // --- API ---
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {
        Page: page,
        PageSize: pageSize,
        StartDate: startDate,
        EndDate: endDate,
        Search: searchTerm || undefined,
        SearchCategoryOrCustomer: searchCategoryOrCustomer || undefined, 
        PaymentMethod: paymentMethod ? Number(paymentMethod) : undefined,
        type: launchType ? Number(launchType) : undefined 
      };

      const response = await api.get('/api/financial/dashboard-financial/flow-report', { params });
      setReportData(response.data);

    } catch (error) {
      console.error("Erro ao gerar relatório", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    setPage(1);
    fetchReport();
  };

  const handleClearFilters = () => {
    const { start, end } = getCurrentMonthDates();
    setStartDate(start);
    setEndDate(end);
    setSearchTerm('');
    setSearchCategoryOrCustomer('');
    setPaymentMethod('');
    setLaunchType('');
    setPage(1);
    // fetchReport(); // Descomente se quiser buscar automaticamente ao limpar
  };

  // --- EXPORTAR PDF ---
  const handleExportPdf = async () => {
    try {
        const params = { 
            StartDate: startDate, 
            EndDate: endDate, 
            Search: searchTerm || undefined,
            SearchCategoryOrCustomer: searchCategoryOrCustomer || undefined,
            PaymentMethod: paymentMethod ? Number(paymentMethod) : undefined,
            type: launchType ? Number(launchType) : undefined
        };
        
        const response = await api.get('/api/financial/dashboard-financial/flow-report/pdf', { 
            params, responseType: 'blob' 
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `caixa_${startDate}_${endDate}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error(error);
        alert(getApiErrorMessage(error, 'Não foi possível exportar o PDF.'));
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="text-blue-600"/> Movimento de Caixa
            </h1>
            <p className="text-slate-500">Relatório detalhado de entradas e saídas.</p>
        </div>
        <Button variant="outline" icon={Download} onClick={handleExportPdf}>EXPORTAR PDF</Button>
      </div>
      
      {/* --- FILTROS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
         {/* Linha 1: Buscas textuais e Datas */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
            {/* Busca Geral (Descrição) */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descrição / Obs</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg outline-none text-sm transition-all focus:border-blue-500" 
                        placeholder="Buscar por descrição..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                    />
                </div>
            </div>

            {/* Busca Categoria/Cliente */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cliente ou Categoria</label>
                <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg outline-none text-sm transition-all focus:border-blue-500" 
                        placeholder="Nome do cliente ou categoria..."
                        value={searchCategoryOrCustomer}
                        onChange={e => setSearchCategoryOrCustomer(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                    />
                </div>
            </div>

            {/* Data Inicio */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Início</label>
                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" value={startDate} onChange={e => setStartDate(e.target.value)}/>
            </div>
            
            {/* Data Fim */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fim</label>
                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" value={endDate} onChange={e => setEndDate(e.target.value)}/>
            </div>
         </div>
         
         {/* Linha 2: Dropdowns e Botões de Ação */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end pt-4 border-t border-slate-100">
             {/* Filtro de Tipo (Entrada/Saída) */}
             <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tipo de Lançamento</label>
                 <select 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm bg-white" 
                    value={launchType} 
                    onChange={e => setLaunchType(e.target.value)}
                 >
                     <option value="">Todos os Tipos</option>
                     {Object.entries(LaunchTypeDescriptions).map(([id, label]) => (
                         <option key={id} value={id}>{label}</option>
                     ))}
                 </select>
             </div>

             {/* Método de Pagamento */}
             <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Método Pagamento</label>
                 <select className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm bg-white" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                     <option value="">Todos</option>
                     {Object.entries(PaymentMethodDescriptions).map(([id, label]) => (
                         <option key={id} value={id}>{label}</option>
                     ))}
                 </select>
             </div>

             {/* Espaço Vazio para alinhamento */}
             <div className="hidden md:block"></div>

             {/* --- BOTÕES DE AÇÃO --- */}
             <div className="flex items-center gap-2">
                <Button 
                    variant="outline" 
                    className="px-3 border-slate-300 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                    title="Limpar todos os filtros"
                    onClick={handleClearFilters}
                    disabled={loading}
                 >
                    <X size={20} />
                 </Button>

                 <Button variant="primary" className="w-full flex-1" icon={loading ? Loader2 : Filter} onClick={handleGenerate} disabled={loading}>
                     {loading ? 'BUSCANDO...' : 'FILTRAR'}
                 </Button>
             </div>
         </div>
      </div>

      {/* --- CARDS DE RESUMO --- */}
      {reportData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl flex items-center justify-between">
                  <div>
                      <p className="text-sm font-bold text-emerald-700 uppercase">Total Entradas</p>
                      <h3 className="text-2xl font-bold text-emerald-800 mt-1">{formatMoney(reportData.totalEntradas)}</h3>
                  </div>
                  <div className="p-3 bg-white rounded-full text-emerald-500 shadow-sm"><ArrowUpCircle size={24}/></div>
              </div>

              <div className="bg-red-50 border border-red-100 p-6 rounded-xl flex items-center justify-between">
                  <div>
                      <p className="text-sm font-bold text-red-700 uppercase">Total Saídas</p>
                      <h3 className="text-2xl font-bold text-red-800 mt-1">{formatMoney(reportData.totalSaidas)}</h3>
                  </div>
                  <div className="p-3 bg-white rounded-full text-red-500 shadow-sm"><ArrowDownCircle size={24}/></div>
              </div>

              <div className={`border p-6 rounded-xl flex items-center justify-between ${reportData.saldo >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                  <div>
                      <p className={`text-sm font-bold uppercase ${reportData.saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Saldo do Período</p>
                      <h3 className={`text-2xl font-bold mt-1 ${reportData.saldo >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>{formatMoney(reportData.saldo)}</h3>
                  </div>
                  <div className={`p-3 bg-white rounded-full shadow-sm ${reportData.saldo >= 0 ? 'text-blue-500' : 'text-orange-500'}`}><Wallet size={24}/></div>
              </div>
          </div>
      )}

      {/* --- TABELA DE RESULTADOS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                    <tr>
                        <th className="p-4 text-center">Data</th>
                        <th className="p-4">Descrição</th>
                        <th className="p-4">Categoria / Cliente</th>
                        <th className="p-4 text-center">Pagamento</th>
                        <th className="p-4 text-center">Tipo</th>
                        <th className="p-4 text-right">Valor</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin inline text-blue-500"/> Carregando...</td></tr>
                    ) : !reportData || reportData.items.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Nenhum movimento encontrado neste período.</td></tr>
                    ) : (
                        reportData.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 text-center text-slate-600 font-mono">
                                    {formatDate(item.launchDate)}
                                </td>
                                <td className="p-4 font-medium text-slate-800">
                                    {item.description}
                                </td>
                                <td className="p-4 text-slate-600">
                                    <div className="flex flex-col text-xs">
                                        <span className="font-bold flex items-center gap-1"><Tags size={10}/> {item.categoryName || '-'}</span>
                                        <span className="text-slate-400 flex items-center gap-1"><Users size={10}/> {item.customerName || '-'}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-center text-slate-500 text-xs">
                                    {item.paymentMethod}
                                </td>
                                <td className="p-4 text-center text-xs">
                                     <span className={`px-2 py-1 rounded-full border ${item.type === 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                        {item.type === 1 ? 'Entrada' : 'Saída'}
                                     </span>
                                </td>
                                <td className={`p-4 text-right font-bold ${item.type === 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {item.type === 1 ? '+' : '-'} {formatMoney(item.amount)}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
             </table>
         </div>

         {/* Paginação estilizada (LARANJA CLARO) */}
         {reportData && (
             <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-sm text-slate-500">Total: <strong>{reportData.totalItems}</strong> lançamentos</span>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))} 
                        disabled={page === 1 || loading} 
                        className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        <ChevronLeft size={16}/>
                    </button>
                    
                    <span className="text-sm px-2 text-slate-600 font-medium">{page} de {reportData.totalPages || 1}</span>
                    
                    <button 
                        onClick={() => setPage(p => (p < reportData.totalPages ? p + 1 : p))} 
                        disabled={page >= reportData.totalPages || loading} 
                        className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        <ChevronRight size={16}/>
                    </button>
                </div>
             </div>
         )}
      </div>

    </div>
  );
}
