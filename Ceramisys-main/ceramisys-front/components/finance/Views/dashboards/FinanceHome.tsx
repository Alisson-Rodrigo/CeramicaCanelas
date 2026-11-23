'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Wallet, 
  Loader2, Calendar, AlertCircle 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { api } from '@/lib/api';

// --- INTERFACES (Baseado no JSON da API) ---
interface MonthlyChartItem {
  month: string; // ex: "2025-02"
  totalIncome: number;
  totalExpense: number;
}

interface DashboardSummary {
  totalIncomeYear: number;
  totalExpenseYear: number;
  balanceYear: number;
  totalIncome30Days: number;
  totalExpense30Days: number;
  pendingReceivables: number;
  pendingPayments: number;
  currentBalance: number;
  lastLaunchDate: string;
  customersWithLaunches: number;
  monthlyChart: MonthlyChartItem[];
}

// --- HELPERS ---
const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatMonth = (dateStr: string) => {
  // Converte "2025-02" para "Fev/25"
  if (!dateStr) return '';
  const parts = dateStr.split('-'); // [2025, 02]
  if (parts.length !== 2) return dateStr;
  
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // JS meses são 0-11
  
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    // Garante que o timezone não altere a data visualmente
    const date = new Date(dateStr + 'T00:00:00'); 
    return date.toLocaleDateString('pt-BR');
};

export function FinanceHome() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/api/financial/dashboard-financial/summary');
      setData(response.data);
    } catch (error) {
      console.error("Erro ao carregar dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!data) return null;

  // Configuração dos Cards com dados da API
  const kpis = [
    { 
        label: 'Saldo Atual', 
        val: data.currentBalance, 
        icon: Wallet, 
        color: 'text-blue-600', 
        bg: 'bg-blue-50',
        sub: 'Disponível em caixa'
    },
    { 
        label: 'Receitas (30 Dias)', 
        val: data.totalIncome30Days, 
        icon: TrendingUp, 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50',
        sub: 'Entradas recentes'
    },
    { 
        label: 'Despesas (30 Dias)', 
        val: data.totalExpense30Days, 
        icon: TrendingDown, 
        color: 'text-red-600', 
        bg: 'bg-red-50',
        sub: 'Saídas recentes'
    },
    { 
        label: 'Contas Pendentes', 
        val: data.pendingPayments, // Valor principal: A Pagar
        icon: AlertCircle, 
        color: 'text-orange-600', 
        bg: 'bg-orange-50',
        sub: `+ ${formatMoney(data.pendingReceivables)} a receber` // Subtexto: A Receber
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* CABEÇALHO */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Painel Financeiro</h1>
            <p className="text-sm text-gray-500 mt-1">Visão geral do fluxo de caixa e desempenho.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Calendar size={14} />
            Último lançamento: {formatDate(data.lastLaunchDate)}
        </div>
      </div>
      
      {/* CARDS DE KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
             <div className="flex justify-between items-start mb-4">
                 <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color}`}>
                     <kpi.icon size={22} />
                 </div>
                 {/* Lógica simples para indicar saldo negativo no primeiro card */}
                 {idx === 0 && kpi.val < 0 && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Negativo</span>}
             </div>
             <div>
                 <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                 <h3 className={`text-2xl font-bold mt-1 ${idx === 0 && kpi.val < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                    {formatMoney(kpi.val)}
                 </h3>
                 <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
             </div>
          </div>
        ))}
      </div>

      {/* ÁREA GRÁFICA + RESUMOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Gráfico Principal (Mensal) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-500"/> Evolução Financeira (12 Meses)
              </h3>
              <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.monthlyChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                          <XAxis 
                            dataKey="month" 
                            tickFormatter={formatMonth} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#64748b'}}
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#64748b'}}
                            tickFormatter={(val) => `R$ ${val/1000}k`}
                          />
                          <Tooltip 
                            formatter={(value: number | undefined) => value !== undefined ? formatMoney(value) : ''}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelFormatter={formatMonth}
                            cursor={{ fill: '#f8fafc' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                          <Bar name="Receitas" dataKey="totalIncome" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                          <Bar name="Despesas" dataKey="totalExpense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Resumo Anual (Mini Card Lateral) */}
          <div className="space-y-4">
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                      <p className="text-slate-300 text-sm font-medium mb-1">Balanço do Ano</p>
                      <h2 className={`text-3xl font-bold ${data.balanceYear < 0 ? 'text-red-300' : 'text-white'}`}>
                        {formatMoney(data.balanceYear)}
                      </h2>
                      
                      <div className="mt-6 space-y-3">
                          <div className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                              <span className="text-slate-400">Total Receitas</span>
                              <span className="text-emerald-400 font-bold">+ {formatMoney(data.totalIncomeYear)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Total Despesas</span>
                              <span className="text-red-400 font-bold">- {formatMoney(data.totalExpenseYear)}</span>
                          </div>
                      </div>
                  </div>
                  {/* Elemento Decorativo */}
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-500 rounded-full opacity-10 blur-2xl"></div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h4 className="font-bold text-slate-700 mb-2">Clientes Ativos</h4>
                  <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-blue-600">{data.customersWithLaunches}</span>
                      <span className="text-sm text-slate-500 mb-1">com lançamentos</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Clientes que movimentaram o caixa.</p>
              </div>
          </div>
      </div>

    </div>
  );
}