import React, { useEffect, useState } from 'react';
import { Package, Layers, DollarSign, AlertTriangle, Loader2, Users } from 'lucide-react';
import { api } from '@/lib/api'; 

interface DashboardData {
  entradasPorMes: number[];
  produtosNaoDevolvidos: number;
  totalProdutosCadastrados: number;
  porcentagemDevolucaoGeral: number;
  produtosComFuncionario: number;
  totalProdutosEstoque: number;
  gastoTotalComprasMes: number;
  alertasEstoqueMinimo: number;
}

export function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await api.get('/api/dashboard/primary');
        setData(response.data);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Define o valor máximo para a escala (evita divisão por zero)
  const maxValue = Math.max(...data.entradasPorMes, 1);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            Dashboard <span className="text-gray-300">/</span> <span className="text-blue-600">Almoxarifado</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Visão geral do estoque e movimentações.</p>
        </div>
      </div>

      {/* CARDS DE KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Package size={22} /></div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Produtos Cadastrados</p>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{data.totalProdutosCadastrados}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600"><Layers size={22} /></div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Volume em Estoque</p>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{data.totalProdutosEstoque}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><DollarSign size={22} /></div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Compras do Mês</p>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{formatCurrency(data.gastoTotalComprasMes)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-red-50 text-red-600"><AlertTriangle size={22} /></div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Alertas de Estoque</p>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{data.alertasEstoqueMinimo}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO DE BARRAS CORRIGIDO */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Entradas Mensais (Qtd)</h2>
          
          <div className="h-64 w-full">
            <div className="flex items-end justify-between h-full gap-2">
              {data.entradasPorMes.map((valor, i) => {
                // Cálculo da altura
                const heightPercentage = Math.round((valor / maxValue) * 100);
                // Altura mínima visual de 4% se for zero, apenas para marcar o lugar
                const displayHeight = valor === 0 ? 4 : heightPercentage; 

                return (
                  // CORREÇÃO AQUI: Adicionado 'h-full' e 'justify-end' para a barra ter referência de altura
                  <div key={i} className="flex flex-col items-center justify-end h-full w-full min-w-[20px] group relative">
                    
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-xs py-1 px-2 rounded transition-opacity pointer-events-none z-10 whitespace-nowrap">
                      {valor} Entradas
                    </div>
                    
                    {/* Barra */}
                    {/* Usamos max-h-[85%] para deixar espaço para o texto do mês embaixo sem estourar o container */}
                    <div className="w-full h-full flex items-end relative">
                         <div 
                            className={`w-full rounded-t-md transition-all duration-700 ease-out ${valor > 0 ? 'bg-blue-500 group-hover:bg-blue-600' : 'bg-gray-100'}`} 
                            style={{ height: `${displayHeight}%` }}
                        ></div>
                    </div>
                    
                    {/* Mês */}
                    <span className="text-[10px] md:text-xs text-gray-400 mt-2 font-medium uppercase">{months[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* STATUS ADICIONAL */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Em Uso / Empréstimos</h2>
          
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 py-8">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 animate-pulse">
               <Users size={32} />
            </div>
            <div>
              <h3 className="text-4xl font-black text-slate-800">{data.produtosComFuncionario}</h3>
              <p className="text-sm text-gray-500 font-medium">Produtos com Funcionários</p>
            </div>
            <div className="w-full border-t border-gray-100 pt-4 mt-4">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Taxa de Devolução</span>
                    <span className="font-bold text-green-600">{data.porcentagemDevolucaoGeral}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                    <div className="bg-green-500 h-full rounded-full transition-all duration-1000" style={{ width: `${data.porcentagemDevolucaoGeral}%` }}></div>
                </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}