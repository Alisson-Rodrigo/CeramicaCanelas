import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, ShoppingBag, Users, Loader2, CreditCard, Package, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';

// --- INTERFACES ATUALIZADAS (Baseado no seu JSON) ---
interface TopProduct {
  product: number;
  productDescription: string;
  totalQuantity: number;
  totalRevenue: number;
  salesCount: number;
}

interface PaymentStat {
  paymentMethod: number;
  paymentMethodDescription: string;
  count: number;
  totalRevenue: number;
  percentage: number;
}

interface TopCity {
  city: string;
  state: string;
  salesCount: number;
  totalRevenue: number;
}

interface DashboardData {
  salesThisMonth: number;
  revenueThisMonth: number;
  salesThisYear: number;
  revenueThisYear: number;
  salesLast30Days: number;
  revenueLast30Days: number;
  averageTicket: number;
  uniqueCustomers: number;
  salesByMonth: number[];
  revenueByMonth: number[];
  topProducts: TopProduct[];
  paymentMethodStats: PaymentStat[];
  topCities: TopCity[];
  conversionRate: number;
  monthlyGrowthPercentage: number;
  totalActiveSales: number;
}

export function SalesHome() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/api/sales/dashboard');
      setData(response.data);
    } catch (error) {
      console.error("Erro ao carregar dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  // --- HELPERS ---
  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading) {
    return <div className="flex justify-center items-center h-96 animate-fade-in"><Loader2 className="animate-spin text-blue-600" size={32}/></div>;
  }

  if (!data) return null;

  // Dica: Se salesThisMonth for 0, talvez queira mostrar salesLast30Days. 
  // Mantive conforme o original, mas você pode alterar a prop value abaixo se quiser.

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
                Dashboard <span className="text-gray-300">/</span> <span className="text-blue-600">Vendas</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">Resumo comercial geral.</p>
        </div>
      </div>
      
      {/* KPIS (CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KpiCard 
            label="Faturamento (30 dias)" 
            value={formatMoney(data.revenueLast30Days)} // Alterado para 30 dias pois o Mês atual no JSON estava 0
            icon={DollarSign} 
            color="text-emerald-600" 
            bg="bg-emerald-50" 
        />
        <KpiCard 
            label="Vendas (30 dias)" 
            value={data.salesLast30Days.toString()} // Alterado para 30 dias pois o Mês atual no JSON estava 0
            icon={ShoppingBag} 
            color="text-blue-600" 
            bg="bg-blue-50" 
        />
        <KpiCard 
            label="Ticket Médio" 
            value={formatMoney(data.averageTicket)} 
            icon={TrendingUp} 
            color="text-purple-600" 
            bg="bg-purple-50" 
        />
        <KpiCard 
            label="Clientes Únicos" 
            value={data.uniqueCustomers.toString()} 
            icon={Users} 
            color="text-orange-600" 
            bg="bg-orange-50" 
        />
      </div>

      {/* ÁREA DE CONTEÚDO PRINCIPAL (SEM OS GRÁFICOS REMOVIDOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* PRODUTOS MAIS VENDIDOS (Ocupa 2 colunas em telas grandes) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Package size={18} className="text-blue-500"/> Produtos Mais Vendidos
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                        <tr>
                            <th className="p-3">Produto</th>
                            <th className="p-3 text-center">Qtd</th>
                            <th className="p-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.topProducts.map((prod, i) => (
                            <tr key={i}>
                                <td className="p-3 font-medium text-slate-700">{prod.productDescription}</td>
                                <td className="p-3 text-center text-slate-500">{prod.totalQuantity}</td>
                                <td className="p-3 text-right font-bold text-emerald-600">{formatMoney(prod.totalRevenue)}</td>
                            </tr>
                        ))}
                        {data.topProducts.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-400">Sem vendas.</td></tr>}
                    </tbody>
                </table>
            </div>
          </div>

          {/* MEIOS DE PAGAMENTO (Ocupa 1 coluna) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-purple-500"/> Meios de Pagamento
            </h2>
            <div className="space-y-6">
                {data.paymentMethodStats.map((pay, i) => (
                    <div key={i} className="flex flex-col gap-1">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700">{pay.paymentMethodDescription}</span>
                            <span className="font-bold text-slate-800">{formatMoney(pay.totalRevenue)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${pay.percentage}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-400 text-right">{pay.count} transações ({pay.percentage.toFixed(1)}%)</p>
                    </div>
                ))}
                 {data.paymentMethodStats.length === 0 && <p className="text-sm text-gray-400 italic">Sem dados financeiros.</p>}
            </div>
          </div>

      </div>
    </div>
  );
}

// Subcomponente para os Cards de KPI
function KpiCard({ label, value, icon: Icon, color, bg }: { label: string, value: string, icon: LucideIcon, color: string, bg: string }) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between hover:-translate-y-1 transition-transform">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${bg} ${color}`}>
                    <Icon size={22} />
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{value}</h3>
            </div>
        </div>
    );
}
