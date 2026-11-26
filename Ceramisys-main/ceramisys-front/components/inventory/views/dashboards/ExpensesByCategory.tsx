import React, { useState, useEffect } from 'react';
import { BarChart3, Filter, Search, X, Loader2, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

// --- INTERFACES ---
interface CategoryItem {
  categoryName: string;
  year: number;
  month: number;
  totalCost: number;
}

interface DashboardData {
  pagedData: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    items: CategoryItem[];
  };
  totalCostOverall: number;
  averageCostPerRecord: number;
}

interface Category {
  id: string;
  name: string;
}

export function ExpensesByCategory() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filtros
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recarrega quando mudar o filtro
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, selectedCategoryId]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data);
    } catch (error) {
      console.error("Erro ao buscar categorias", error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = {
        Page: 1,
        PageSize: 100, // Trazemos mais dados para o gráfico ficar bonito
        Year: year,
        CategoryId: selectedCategoryId || undefined
      };

      const response = await api.get('/api/dashboard/financial/monthly-cost-category', { params });
      setData(response.data);
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getMonthName = (month: number) => {
    const date = new Date();
    date.setMonth(month - 1);
    return date.toLocaleString('pt-BR', { month: 'long' });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-16 sm:pb-20">
      
      {/* CABEÇALHO E FILTROS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-orange-600" /> Gastos por Categoria
          </h1>
          <p className="text-slate-500">Análise de custos mensais.</p>
        </div>

        <div className="flex gap-2">
          {/* Filtro de Ano */}
          <select 
            className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-slate-700 bg-white"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Filtro de Categoria */}
          <select 
            className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-slate-700 bg-white"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
          >
            <option value="">Todas Categorias</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center p-12 text-slate-500">
          <Loader2 className="animate-spin mr-2" /> Carregando dashboard...
        </div>
      ) : (
        <>
          {/* CARDS DE RESUMO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">Custo Total (Período)</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">
                  {formatCurrency(data?.totalCostOverall || 0)}
                </h3>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-full">
                <DollarSign size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">Média por Registro</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">
                  {formatCurrency(data?.averageCostPerRecord || 0)}
                </h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                <TrendingUp size={24} />
              </div>
            </div>
          </div>

          {/* GRÁFICO */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Visão Gráfica</h3>
            <div className="h-80 w-full">
              {data?.pagedData.items.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.pagedData.items} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis 
                      dataKey="categoryName" 
                      tick={{fill: 'var(--text-secondary)', fontSize: 12}}
                      axisLine={false} 
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{fill: 'var(--text-secondary)', fontSize: 12}}
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(value) => `R$ ${value}`}
                    />
                    <Tooltip 
                      cursor={{fill: 'var(--surface-muted)'}}
                      contentStyle={{ borderRadius: '8px', borderColor: 'var(--border-subtle)', backgroundColor: 'var(--surface-raised)' }}
                      labelStyle={{ color: 'var(--text-primary)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Custo Total']}
                    />
                    <Bar 
                      dataKey="totalCost" 
                      fill="#f97316" 
                      radius={[4, 4, 0, 0]} 
                      name="Custo Total"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <BarChart3 size={48} className="mb-2 opacity-50" />
                  <p>Sem dados para exibir no gráfico.</p>
                </div>
              )}
            </div>
          </div>

          {/* TABELA DETALHADA */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Detalhamento</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Mês/Ano</th>
                    <th className="p-4 text-right">Custo Total</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-600">
                  {data?.pagedData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                      <td className="p-4 font-bold text-slate-800">{item.categoryName}</td>
                      <td className="p-4 capitalize flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {getMonthName(item.month)} / {item.year}
                      </td>
                      <td className="p-4 text-right font-medium text-red-600">
                        {formatCurrency(item.totalCost)}
                      </td>
                    </tr>
                  ))}
                  {(!data?.pagedData.items || data.pagedData.items.length === 0) && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500">
                        Nenhum registro encontrado para este período.
                      </td>
                    </tr>
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
