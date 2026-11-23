import React, { useState, useEffect } from 'react';
import { Repeat, Filter, X, Search, Loader2, ChevronLeft, ChevronRight, Package, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

// --- INTERFACES ---
// Baseada exatamente no JSON fornecido
interface RecurringItem {
  productName: string;
  category: string;
  totalSaidas: number;
  ultimaRetirada: string;
  estoqueAtual: number;
}

interface Category {
  id: string;
  name: string;
}

export function RecurringWithdrawals() {
  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Paginação
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');

  // --- EFEITOS ---
  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // --- API ---
  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data);
    } catch (error) { console.error("Erro categorias", error); }
  };

  const fetchReport = async (isReset = false) => {
    setLoading(true);
    try {
      const params = {
        Page: isReset ? 1 : page,
        PageSize: pageSize,
        Search: isReset ? '' : searchTerm,
        CategoryId: (isReset || filterCategoryId === '') ? undefined : filterCategoryId,
      };

      // Endpoint fornecido
      const response = await api.get('/api/dashboard/reports/products/most-used', { params });
      const data = response.data;

      if (data.items) {
        setItems(data.items);
        setTotalItems(data.totalItems || 0);
      } else {
        setItems([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error("Erro ao buscar retiradas recorrentes", error);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleFilter = () => { setPage(1); fetchReport(); };
  const handleClearFilters = () => { setSearchTerm(''); setFilterCategoryId(''); setPage(1); fetchReport(true); };

  // --- HELPERS ---
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const totalPages = Math.ceil(totalItems / pageSize);
  
  // Estilo Roxo/Indigo para diferenciar de entradas/saídas comuns
  const inputClass = "w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 text-sm";

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Repeat className="text-purple-600" /> Retiradas Recorrentes
          </h1>
          <p className="text-slate-500">Ranking de produtos com maior volume de saída.</p>
        </div>
      </div>

      {/* --- BARRA DE FILTROS --- */}
      <div className="bg-white p-6 rounded-xl border border-purple-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buscar Produto</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                className={`${inputClass} pl-10`} 
                placeholder="Nome do produto..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFilter()}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
            <select className={inputClass} value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
                <option value="">Todas</option>
                {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" icon={X} onClick={handleClearFilters}>LIMPAR</Button>
          <Button variant="soft" size="sm" icon={Filter} onClick={handleFilter}>FILTRAR DADOS</Button>
        </div>
      </div>

      {/* --- LISTAGEM --- */}
      <div className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 border-collapse min-w-[800px]">
            <thead className="bg-purple-50 text-purple-900 text-xs uppercase font-bold border-b border-purple-100">
              <tr>
                <th className="p-4 w-16 text-center">Rank</th>
                <th className="p-4">Produto</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-center">Total Saídas</th>
                <th className="p-4 text-center">Última Retirada</th>
                <th className="p-4 text-center">Estoque Atual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center"><div className="flex justify-center gap-2 text-slate-500"><Loader2 className="animate-spin"/> Carregando...</div></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum dado encontrado.</td></tr>
              ) : (
                items.map((item, index) => {
                  const rank = (page - 1) * pageSize + index + 1;
                  return (
                    <tr key={index} className="hover:bg-purple-50/30 transition-colors group">
                      <td className="p-4 text-center font-bold text-slate-400">
                        {rank}º
                      </td>
                      <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                          <Package size={16} className="text-purple-400 group-hover:text-purple-600" />
                          {item.productName}
                      </td>
                      <td className="p-4 text-slate-600">
                          <span className="bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">
                            {item.category}
                          </span>
                      </td>
                      
                      {/* Destaque Recorrência */}
                      <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
                              <Repeat size={12} /> {item.totalSaidas}
                          </span>
                      </td>
                      
                      <td className="p-4 text-center text-slate-500 text-xs">
                          <div className="flex items-center justify-center gap-1">
                              <Calendar size={14} />
                              {formatDate(item.ultimaRetirada)}
                          </div>
                      </td>

                      {/* Estoque com Alerta */}
                      <td className="p-4 text-center">
                          {item.estoqueAtual === 0 ? (
                             <span className="flex items-center justify-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-1 rounded text-xs">
                                <AlertCircle size={12} /> ZERADO
                             </span>
                          ) : (
                             <span className="font-bold text-emerald-600">{item.estoqueAtual} un</span>
                          )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé Paginação */}
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
