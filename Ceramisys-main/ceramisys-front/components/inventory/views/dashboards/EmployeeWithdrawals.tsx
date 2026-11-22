import React, { useState, useEffect } from 'react';
import { UserMinus, Filter, X, Search, Calendar, Package, Loader2, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

// --- INTERFACES ---
interface WithdrawalItem {
  employeeName: string;
  productName: string;
  quantityRetirada: number;
  quantityDevolvida: number;
  quantityPendente: number;
  dataRetirada: string;
}

export function EmployeeWithdrawals() {
  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<WithdrawalItem[]>([]);
  
  // Paginação
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Filtros
  const [searchEmployee, setSearchEmployee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- EFEITOS ---
  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // --- API ---
  const fetchReport = async (isReset = false) => {
    setLoading(true);
    try {
      const params = {
        Page: isReset ? 1 : page,
        PageSize: pageSize,
        SearchEmployee: (isReset ? '' : searchEmployee) || undefined,
        StartDate: (isReset ? '' : startDate) || undefined,
        EndDate: (isReset ? '' : endDate) || undefined,
      };

      const response = await api.get('/api/dashboard/reports/employees', { params });
      const data = response.data;

      if (data.items) {
        setItems(data.items);
        setTotalItems(data.totalItems || 0);
      } else {
        setItems([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error("Erro ao buscar relatório de retiradas", error);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleFilter = () => { setPage(1); fetchReport(); };
  const handleClearFilters = () => { 
    setSearchEmployee(''); 
    setStartDate(''); 
    setEndDate(''); 
    setPage(1); 
    fetchReport(true); 
  };

  // --- HELPERS ---
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  const totalPages = Math.ceil(totalItems / pageSize);
  const inputClass = "w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm";

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserMinus className="text-blue-600" /> Retiradas por Funcionário
          </h1>
          <p className="text-slate-500">Histórico detalhado de movimentações por colaborador.</p>
        </div>
      </div>

      {/* --- BARRA DE FILTROS --- */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Funcionário</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                className={`${inputClass} pl-10`} 
                placeholder="Nome do colaborador..." 
                value={searchEmployee}
                onChange={e => setSearchEmployee(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFilter()}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Início</label>
            <div className="relative">
                <input 
                  type="datetime-local" 
                  className={inputClass} 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Fim</label>
            <div className="relative">
                <input 
                  type="datetime-local" 
                  className={inputClass} 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" icon={X} onClick={handleClearFilters}>LIMPAR</Button>
          <Button variant="soft" size="sm" icon={Filter} onClick={handleFilter}>FILTRAR DADOS</Button>
        </div>
      </div>

      {/* --- LISTAGEM --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 border-collapse min-w-[900px]">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="p-4">Funcionário & Produto</th>
                <th className="p-4 text-center">Data Retirada</th>
                <th className="p-4 text-center">Retirado</th>
                <th className="p-4 text-center">Devolvido</th>
                {/* Coluna unificada */}
                <th className="p-4 text-center">Status / Pendente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center"><div className="flex justify-center gap-2 text-slate-500"><Loader2 className="animate-spin"/> Carregando...</div></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum registro encontrado.</td></tr>
              ) : (
                items.map((item, index) => {
                  const isPending = item.quantityPendente > 0;
                  return (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-800 flex items-center gap-2">
                                <User size={16} className="text-slate-400" /> {item.employeeName}
                            </span>
                            <span className="text-slate-500 text-xs flex items-center gap-2 ml-6">
                                <Package size={14} className="text-blue-400" /> {item.productName}
                            </span>
                        </div>
                      </td>
                      <td className="p-4 text-center text-slate-500 text-xs">
                          {formatDate(item.dataRetirada)}
                      </td>
                      
                      <td className="p-4 text-center font-medium text-slate-900">{item.quantityRetirada}</td>
                      <td className="p-4 text-center text-slate-500">{item.quantityDevolvida}</td>

                      {/* Coluna UNIFICADA: Mostra a quantidade pendente E o status visual */}
                      <td className="p-4 text-center">
                          {isPending ? (
                             <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                {item.quantityPendente} PENDENTE
                             </span>
                          ) : (
                             <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                CONCLUÍDO
                             </span>
                          )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-sm text-slate-500">Total: <strong>{totalItems}</strong> registros</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"><ChevronLeft size={16} /></button>
            <span className="text-sm font-medium text-slate-700 px-2">Pág. {page} de {totalPages || 1}</span>
            <button onClick={() => setPage(p => (totalPages && p < totalPages ? p + 1 : p))} disabled={page >= totalPages || loading} className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
