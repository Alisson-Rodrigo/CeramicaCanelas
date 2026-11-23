import React, { useState, useEffect } from 'react';
import { FileBarChart, Filter, Download, TrendingUp, TrendingDown, Wallet, ArrowRightLeft, Loader2, Search, FileText, X, ChevronRight, Layers, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- HELPER DE FORMATAÇÃO ---
const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Helper para data (evita fuso horário)
const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const cleanDate = dateStr.split('T')[0]; 
    const [year, month, day] = cleanDate.split('-');
    return `${day}/${month}/${year}`;
};

// Helper para iniciar inputs com hoje (Local Time)
const getTodayLocal = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Primeiro dia do mês
const getFirstDayOfMonth = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
};

// --- ENUMS APENAS PARA O FILTRO (Onde enviamos ID) ---
const PaymentMethodDescriptions: Record<number, string> = {
  0: "Dinheiro", 1: "CXPJ", 2: "BBJ", 3: "BBJN", 4: "CHEQUE", 5: "BradescoPJ", 6: "CXJ", 7: "Débito Automático"
};

const StatusDescriptions: Record<number, string> = {
  0: "Pendente",
  1: "Pago"
};

// --- INTERFACES (Baseadas no seu JSON exato) ---
interface DropdownItem { id: string; name: string; }

interface AccountItem { 
    accountName: string; // "CXPJ", "Dinheiro"
    totalIncome: number; 
}

interface CategoryItem { 
    categoryName: string; 
    totalExpense: number; 
}

interface GroupItem { 
    groupName: string; 
    groupExpense: number; 
    categories: CategoryItem[]; 
}

interface ExtractItem { 
    accountName: string; 
    date: string; 
    description: string; 
    value: number; 
    type: string; // "Entrada"
}

interface BalanceResponse {
  startDate: string | null;
  endDate: string | null;
  totalIncomeOverall: number;
  totalExpenseOverall: number;
  totalExtractOverall: number;
  netBalance: number;
  accounts: AccountItem[];
  groups: GroupItem[];
  extracts: ExtractItem[];
}

export function VerificationBalance() {
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [reportData, setReportData] = useState<BalanceResponse | null>(null);

  // --- ESTADOS DOS FILTROS ---
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getTodayLocal());
  const [search, setSearch] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState('');
  const [groupId, setGroupId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // Listas Dropdown
  const [groupsList, setGroupsList] = useState<DropdownItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<DropdownItem[]>([]);

  useEffect(() => {
    fetchFiltersData();
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFiltersData = async () => {
    try {
        const catRes = await api.get('/api/financial/launch-categories/paged', { params: { Page: 1, PageSize: 100 } });
        if(catRes.data.items) setCategoriesList(catRes.data.items);

        const groupRes = await api.get('/api/financial/launch-category-groups/paged', { params: { Page: 1, PageSize: 100 } }); 
        if(groupRes.data.items) setGroupsList(groupRes.data.items);
    } catch (error) { console.error("Erro filtros", error); }
  };

  const buildParams = () => {
      return {
        StartDate: startDate,
        EndDate: endDate,
        Search: search || undefined,
        PaymentMethod: paymentMethod !== '' ? Number(paymentMethod) : undefined,
        Status: status !== '' ? Number(status) : undefined,
        GroupId: groupId || undefined,
        CategoryId: categoryId || undefined
      };
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = buildParams();
      const response = await api.get('/api/financial/dashboard-financial/with-extract', { params });
      // Define os dados exatamente como vieram do JSON
      setReportData(response.data);
    } catch (error) {
      console.error("Erro report", error);
      alert(getApiErrorMessage(error, 'Não foi possível carregar o relatório.'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    setPdfLoading(true);
    try {
        const params = buildParams();
        const response = await api.get('/api/financial/dashboard-financial/trial-balance/pdf', { 
            params, 
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `balancete_${startDate}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Erro PDF", error);
        alert(getApiErrorMessage(error, 'Não foi possível gerar o PDF.'));
    } finally {
        setPdfLoading(false);
    }
  };

  const handleClearFilters = () => {
      setSearch(''); setPaymentMethod(''); setStatus(''); setGroupId(''); setCategoryId('');
      setStartDate(getFirstDayOfMonth());
      setEndDate(getTodayLocal());
  };

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-xs bg-white text-slate-700 h-9";
  const labelClass = "text-[10px] font-bold text-slate-500 uppercase mb-1 block";

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileBarChart className="text-blue-600"/> Balancete de Verificação
            </h1>
            <p className="text-slate-500">Conciliação completa de entradas, saídas e extratos.</p>
        </div>
      </div>
      
      {/* FILTROS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
             <div className="md:col-span-2">
                 <label className={labelClass}>Buscar (Descrição)</label>
                 <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                    <input type="text" className={`${inputClass} pl-8`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..." onKeyDown={e => e.key === 'Enter' && fetchReport()}/>
                 </div>
             </div>
             <div><label className={labelClass}>Data Início</label><input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)}/></div>
             <div><label className={labelClass}>Data Fim</label><input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)}/></div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
             <div>
                 <label className={labelClass}>Grupo</label>
                 <select className={inputClass} value={groupId} onChange={e => setGroupId(e.target.value)}>
                     <option value="">Todos os Grupos</option>
                     {groupsList.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
                 </select>
             </div>
             <div>
                 <label className={labelClass}>Categoria</label>
                 <select className={inputClass} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                     <option value="">Todas as Categorias</option>
                     {categoriesList.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                 </select>
             </div>
             <div>
                 <label className={labelClass}>Conta / Método</label>
                 <select className={inputClass} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                     <option value="">Todas as Contas</option>
                     {Object.entries(PaymentMethodDescriptions).map(([id, label]) => (<option key={id} value={id}>{label}</option>))}
                 </select>
             </div>
             <div>
                 <label className={labelClass}>Status</label>
                 <select className={inputClass} value={status} onChange={e => setStatus(e.target.value)}>
                     <option value="">Todos</option>
                     {Object.entries(StatusDescriptions).map(([id, label]) => (<option key={id} value={id}>{label}</option>))}
                 </select>
             </div>
         </div>

         <div className="flex justify-end gap-2 mt-5 border-t border-slate-100 pt-4">
             <Button variant="outline" icon={X} onClick={handleClearFilters}>Limpar</Button>
             <Button variant="primary" icon={loading ? Loader2 : Filter} onClick={fetchReport} disabled={loading} className="w-32">{loading ? '...' : 'GERAR'}</Button>
             <Button variant="outline" icon={pdfLoading ? Loader2 : FileText} onClick={handleExportPdf} disabled={pdfLoading} className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 w-32">{pdfLoading ? '...' : 'PDF'}</Button>
         </div>
      </div>

      {/* RELATÓRIO */}
      {reportData && (
        <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-emerald-700 font-bold text-xs uppercase tracking-wider">Entradas Totais</span>
                        <div className="p-1.5 bg-white rounded-full text-emerald-500 shadow-sm"><TrendingUp size={16}/></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-emerald-800">{formatMoney(reportData.totalIncomeOverall)}</h3>
                </div>

                <div className="bg-red-50 border border-red-100 p-5 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-red-700 font-bold text-xs uppercase tracking-wider">Saídas Totais</span>
                        <div className="p-1.5 bg-white rounded-full text-red-500 shadow-sm"><TrendingDown size={16}/></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-red-800">{formatMoney(reportData.totalExpenseOverall)}</h3>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-blue-700 font-bold text-xs uppercase tracking-wider">Extratos (Ajustes)</span>
                        <div className="p-1.5 bg-white rounded-full text-blue-500 shadow-sm"><ArrowRightLeft size={16}/></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-blue-800">{formatMoney(reportData.totalExtractOverall)}</h3>
                </div>

                <div className={`border p-5 rounded-xl shadow-sm ${reportData.netBalance >= 0 ? 'bg-slate-50 border-slate-200' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-600 font-bold text-xs uppercase tracking-wider">Saldo Líquido</span>
                        <div className="p-1.5 bg-white rounded-full text-slate-500 shadow-sm"><Wallet size={16}/></div>
                    </div>
                    <h3 className={`text-2xl font-extrabold ${reportData.netBalance >= 0 ? 'text-slate-800' : 'text-orange-700'}`}>
                        {formatMoney(reportData.netBalance)}
                    </h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* LISTA ENTRADAS */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-3 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500"/> Entradas por Conta
                    </h3>
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-96 pr-2">
                        {reportData.accounts.length === 0 ? (
                            <p className="text-sm text-slate-400 italic p-4 text-center">Nenhum registro de entrada.</p>
                        ) : (
                            reportData.accounts.map((acc, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all">
                                    <span className="text-sm text-slate-700 font-medium">{acc.accountName}</span>
                                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{formatMoney(acc.totalIncome)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* LISTA SAÍDAS */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-3 flex items-center gap-2">
                        <TrendingDown size={18} className="text-red-500"/> Saídas por Grupo
                    </h3>
                    <div className="space-y-4 flex-1 overflow-y-auto max-h-96 pr-2">
                        {reportData.groups.length === 0 ? (
                            <p className="text-sm text-slate-400 italic p-4 text-center">Nenhum registro de saída.</p>
                        ) : (
                            reportData.groups.map((group, idx) => (
                                <div key={idx} className="border border-slate-100 rounded-lg overflow-hidden">
                                    <div className="bg-slate-50 p-3 flex justify-between items-center">
                                        <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                            {group.groupName}
                                        </span>
                                        <span className="font-bold text-red-600 text-sm">{formatMoney(group.groupExpense)}</span>
                                    </div>
                                    <div className="bg-white divide-y divide-slate-50">
                                        {group.categories.map((cat, cIdx) => (
                                            <div key={cIdx} className="flex justify-between items-center p-2 pl-8 text-xs hover:bg-slate-50 transition-colors">
                                                <span className="text-slate-500 flex items-center gap-2">
                                                    <ChevronRight size={12} className="text-slate-300"/> {cat.categoryName}
                                                </span>
                                                <span className="text-slate-600 font-medium">{formatMoney(cat.totalExpense)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* TABELA EXTRATOS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <ArrowRightLeft size={18} className="text-blue-500"/> Detalhamento de Extratos
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4 text-center">Data</th>
                                <th className="p-4">Conta</th>
                                <th className="p-4">Descrição</th>
                                <th className="p-4 text-center">Tipo</th>
                                <th className="p-4 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reportData.extracts.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Nenhum lançamento manual encontrado.</td></tr>
                            ) : (
                                reportData.extracts.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-center font-mono text-slate-600 text-xs">{formatDate(item.date)}</td>
                                        <td className="p-4 font-medium text-slate-700">{item.accountName}</td>
                                        <td className="p-4 text-slate-600 text-xs">{item.description}</td>
                                        <td className="p-4 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${item.type === 'Entrada' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-right font-bold ${item.value >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                            {formatMoney(item.value)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
      )}

    </div>
  );
}
