import React, { useState, useEffect } from 'react';
import { PieChart, Filter, Search, Download, Loader2, User, ShoppingBag, ArrowUpDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- HELPERS ---
const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('pt-BR') : '-';

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
interface ClientReportItem {
  customerId: string;
  customerName: string;
  totalAmount: number;
  ticketMedio: number;
  valorPendente: number;
  quantidadeDeCompras: number;
  dataDaUltimaCompra: string;
}

interface ClientReportResponse {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: ClientReportItem[];
}

export function CustomerReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ClientReportResponse | null>(null);

  // Filtros
  const { start, end } = getCurrentMonthDates();
  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(end);
  const [search, setSearch] = useState('');
  
  // Ordenação e Paginação
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState('totalAmount'); // Padrão: Ordenar por Total
  const [ascending, setAscending] = useState(false);     // Padrão: Maior para menor
  const pageSize = 10;

  // --- EFEITOS ---
  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, orderBy, ascending]);

  // --- API ---
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {
        Page: page,
        PageSize: pageSize,
        StartDate: startDate,
        EndDate: endDate,
        Search: search || undefined,
        OrderBy: orderBy,
        Ascending: ascending
      };

      const response = await api.get('/api/financial/dashboard-financial/clients-balance', { params });
      setReportData(response.data);

    } catch (error) {
      console.error("Erro ao gerar relatório de clientes", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    setPage(1);
    fetchReport();
  };

  // Handler de Ordenação ao clicar no cabeçalho
  const handleSort = (field: string) => {
      if (orderBy === field) {
          setAscending(!ascending); // Inverte se for o mesmo campo
      } else {
          setOrderBy(field);
          setAscending(true); // Padrão ascendente para novo campo
      }
      setPage(1);
  };

  const handleExportPdf = async () => {
    try {
        const params = { StartDate: startDate, EndDate: endDate, Search: search, OrderBy: orderBy, Ascending: ascending };
        const response = await api.get('/api/financial/dashboard-financial/clients-balance/pdf', { 
            params, responseType: 'blob' 
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `relatorio_clientes_${startDate}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        alert(getApiErrorMessage(error, 'Não foi possível exportar o PDF.'));
    }
  };

  // Renderiza ícone de ordenação
  const SortIcon = ({ field }: { field: string }) => {
      if (orderBy !== field) return <ArrowUpDown size={14} className="text-slate-300 ml-1 inline"/>;
      return <ArrowUpDown size={14} className={`text-blue-500 ml-1 inline ${ascending ? '' : 'rotate-180'}`}/>;
  };

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <PieChart className="text-blue-600"/> Relatório de Clientes
            </h1>
            <p className="text-slate-500">Análise de compras, ticket médio e pendências por cliente.</p>
        </div>
      </div>
      
      {/* --- FILTROS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Buscar Cliente</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg outline-none text-sm" 
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Nome do cliente..."
                        onKeyDown={e => e.key === 'Enter' && handleGenerate()}
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
            <Button variant="primary" icon={loading ? Loader2 : Filter} onClick={handleGenerate} disabled={loading}>
                {loading ? 'GERANDO...' : 'GERAR'}
            </Button>
         </div>
      </div>

      {/* --- TABELA --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                    <tr>
                        <th className="p-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('customerName')}>
                            Cliente <SortIcon field="customerName"/>
                        </th>
                        <th className="p-4 text-center cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('quantidadeDeCompras')}>
                            Qtd. Compras <SortIcon field="quantidadeDeCompras"/>
                        </th>
                        <th className="p-4 text-center">Última Compra</th>
                        <th className="p-4 text-right cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('ticketMedio')}>
                            Ticket Médio <SortIcon field="ticketMedio"/>
                        </th>
                        <th className="p-4 text-right cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('valorPendente')}>
                            Pendente <SortIcon field="valorPendente"/>
                        </th>
                        <th className="p-4 text-right cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('totalAmount')}>
                            Total Gasto <SortIcon field="totalAmount"/>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin inline text-blue-500"/> Carregando...</td></tr>
                    ) : !reportData || reportData.items.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Nenhum cliente encontrado com os filtros atuais.</td></tr>
                    ) : (
                        reportData.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-medium text-slate-800 flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-full"><User size={14}/></div>
                                    {item.customerName}
                                </td>
                                <td className="p-4 text-center">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">
                                        <ShoppingBag size={12}/> {item.quantidadeDeCompras}
                                    </span>
                                </td>
                                <td className="p-4 text-center text-slate-500 text-xs font-mono">
                                    {formatDate(item.dataDaUltimaCompra)}
                                </td>
                                <td className="p-4 text-right text-slate-600">
                                    {formatMoney(item.ticketMedio)}
                                </td>
                                <td className={`p-4 text-right font-bold ${item.valorPendente > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                                    {item.valorPendente > 0 ? formatMoney(item.valorPendente) : '-'}
                                </td>
                                <td className="p-4 text-right font-bold text-emerald-600 text-base">
                                    {formatMoney(item.totalAmount)}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
             </table>
         </div>

         {/* Paginação */}
         {reportData && (
             <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-sm text-slate-500">Total: <strong>{reportData.totalItems}</strong> clientes</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="px-3 py-1 border border-slate-300 rounded hover:bg-white disabled:opacity-50 text-sm">Anterior</button>
                    <span className="text-sm px-2 text-slate-700">{page} de {reportData.totalPages || 1}</span>
                    <button onClick={() => setPage(p => (p < reportData.totalPages ? p + 1 : p))} disabled={page >= reportData.totalPages || loading} className="px-3 py-1 border border-slate-300 rounded hover:bg-white disabled:opacity-50 text-sm">Próximo</button>
                </div>
             </div>
         )}
      </div>

    </div>
  );
}
