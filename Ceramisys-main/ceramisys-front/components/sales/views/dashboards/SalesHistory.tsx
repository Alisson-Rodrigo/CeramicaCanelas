import React, { useState, useEffect } from 'react';
import { Search, Filter, X, FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- ENUMS E HELPERS ---
const ProductDescriptions: Record<number, string> = {
  0: "Tijolos de 1ª 06 Furos", 1: "Tijolos de 2ª 06 Furos", 2: "Tijolos de 1ª 08 Furos",
  3: "Tijolos de 2ª 08 Furos", 4: "Tijolos de 08 Furos G", 5: "Tijolo de 6 furos Duplo",
  6: "Blocos de 9 Furos", 7: "Blocos de 9 Furos Duplo", 8: "Bandas 6 furos",
  9: "Bandas 8 furos", 10: "Bandas 9 furos", 11: "Telhas de 1ª",
  12: "Telhas de 2ª", 13: "Lajotas", 14: "Tijolos para churrasqueira",
  15: "Caldeado 6 furos", 16: "Caldeado 8 furos", 17: "Caldeado 9 furos"
};

const SaleStatusDescriptions: Record<number, string> = {
  0: "Pendente", 1: "Parcial", 2: "Confirmado", 3: "Cancelado", 4: "Doação"
};

const PaymentMethodDescriptions: Record<number, string> = {
  0: "Dinheiro", 1: "CXPJ", 2: "BBJ", 3: "BBJN", 4: "CHEQUE", 5: "BradescoPJ", 6: "CXJ", 7: "Débito Automático"
};

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// --- NOVA INTERFACE BASEADA NO SEU JSON ---
interface SalesItemReport {
    product: number;       // Usaremos isso como KEY
    productName: string;
    milheiros: number;
    units: number;
    revenue: number;
    breaks: number;
    avgPrice: number;
}

export function SalesHistory() {
  // Estados de Dados e Loading
  const [items, setItems] = useState<SalesItemReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Paginação
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Filtros
  const [search, setSearch] = useState(''); // NameDescription
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [product, setProduct] = useState('');

  // --- EFEITOS ---
  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // --- API: LISTAGEM DE ITENS ---
  const fetchItems = async (isReset = false) => {
    setLoading(true);
    try {
        const params = {
            Page: isReset ? 1 : page,
            PageSize: pageSize,
            NameDescription: (isReset ? '' : search) || undefined,
            StartDate: (isReset ? '' : startDate) || undefined,
            EndDate: (isReset ? '' : endDate) || undefined,
            Status: (isReset ? undefined : (status !== '' ? Number(status) : undefined)),
            PaymentMethod: (isReset ? undefined : (paymentMethod !== '' ? Number(paymentMethod) : undefined)),
            City: (isReset ? undefined : (city || undefined)),
            State: (isReset ? undefined : (state || undefined)),
            Product: (isReset ? undefined : (product !== '' ? Number(product) : undefined))
        };

        const response = await api.get('/api/sales/items/paged', { params });
        const data = response.data;

        if (data.items) {
            setItems(data.items);
            setTotalItems(data.totalItems || 0);
        } else {
            setItems([]);
            setTotalItems(0);
        }
    } catch (error) {
        console.error("Erro ao buscar itens", error);
    } finally {
        setLoading(false);
    }
  };

  // --- API: GERAR PDF ---
  const handleGeneratePdf = async () => {
    setPdfLoading(true);
    try {
        const params = {
            StartDate: startDate || undefined,
            EndDate: endDate || undefined,
            Status: status !== '' ? Number(status) : undefined,
            PaymentMethod: paymentMethod !== '' ? Number(paymentMethod) : undefined,
            City: city || undefined,
            State: state || undefined,
            Product: product !== '' ? Number(product) : undefined
        };

        const response = await api.get('/api/sales/items/pdf', { params, responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `relatorio_itens_${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error("Erro PDF", error);
        alert(getApiErrorMessage(error, 'Não foi possível gerar o PDF.'));
    } finally {
        setPdfLoading(false);
    }
  };

  const handleFilter = () => { setPage(1); fetchItems(); };
  
  const handleClear = () => {
      setSearch(''); setStartDate(''); setEndDate(''); 
      setStatus(''); setPaymentMethod('');
      setCity(''); setState(''); setProduct(''); 
      setPage(1); fetchItems(true);
  };

  const totalPages = Math.ceil(totalItems / pageSize);
  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white text-slate-700 text-sm focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Relatório Detalhado de Itens</h1>
            <p className="text-slate-500">Visualize o volume de vendas por produto.</p>
        </div>
      </div>
      
      {/* --- ÁREA DE FILTROS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-6 border-b border-slate-200">
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="md:col-span-1 lg:col-span-1">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Buscar</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="text" className={`${inputClass} pl-10`} placeholder="Cliente ou Nota..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleFilter()} />
                        </div>
                    </div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Início</label><input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fim</label><input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status</label>
                        <select className={inputClass} value={status} onChange={e => setStatus(e.target.value)}>
                            <option value="">Todos</option>
                            {Object.entries(SaleStatusDescriptions).map(([id, label]) => (<option key={id} value={id}>{label}</option>))}
                        </select>
                    </div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cidade</label><input type="text" className={inputClass} placeholder="Ex: Picos" value={city} onChange={e => setCity(e.target.value)} /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Estado</label><input type="text" className={inputClass} placeholder="UF" maxLength={2} value={state} onChange={e => setState(e.target.value.toUpperCase().slice(0, 2))} /></div>
                    <div className="md:col-span-1 lg:col-span-2">
                         <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Produto</label>
                         <select className={inputClass} value={product} onChange={e => setProduct(e.target.value)}>
                            <option value="">Todos os Produtos</option>
                            {Object.entries(ProductDescriptions).map(([id, name]) => (<option key={id} value={id}>{name}</option>))}
                         </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Pagamento</label>
                        <select className={inputClass} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                            <option value="">Todos</option>
                            {Object.entries(PaymentMethodDescriptions).map(([id, label]) => (<option key={id} value={id}>{label}</option>))}
                        </select>
                    </div>

                    <div className="md:col-span-2 lg:col-span-3 flex justify-end items-end gap-2">
                        <Button variant="secondary" size="sm" icon={pdfLoading ? Loader2 : FileText} onClick={handleGeneratePdf} disabled={pdfLoading}>{pdfLoading ? 'GERANDO...' : 'RELATÓRIO PDF'}</Button>
                        <div className="h-8 w-px bg-slate-300 mx-2 hidden md:block"></div>
                        <Button variant="outline" size="sm" icon={X} onClick={handleClear}>LIMPAR</Button>
                        <Button variant="soft" size="sm" icon={Filter} onClick={handleFilter}>FILTRAR</Button>
                    </div>
                </div>
            </div>
         </div>

         {/* --- TABELA ATUALIZADA --- */}
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase border-b border-slate-200">
                <tr>
                    <th className="p-4">Produto</th>
                    <th className="p-4 text-center">Milheiros</th>
                    <th className="p-4 text-center">Unidades</th>
                    <th className="p-4 text-center">Quebras</th>
                    <th className="p-4 text-right">Preço Médio</th>
                    <th className="p-4 text-right">Receita Total</th>
                </tr>
                </thead>
                <tbody className="text-slate-600 divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={6} className="p-8 text-center"><div className="flex justify-center gap-2"><Loader2 className="animate-spin"/> Carregando...</div></td></tr>
                    ) : items.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum registro encontrado.</td></tr>
                    ) : (
                        items.map((item) => (
                            // AQUI ESTAVA O ERRO: Use item.product como KEY, pois ele é único nessa lista
                            <tr key={item.product} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-bold text-slate-800">{item.productName}</td>
                                <td className="p-4 text-center">{item.milheiros.toFixed(2)}</td>
                                <td className="p-4 text-center">{item.units}</td>
                                <td className="p-4 text-center text-red-500 font-medium">{item.breaks > 0 ? `-${item.breaks}` : '0'}</td>
                                <td className="p-4 text-right text-slate-500">{formatMoney(item.avgPrice)}</td>
                                <td className="p-4 text-right font-bold text-emerald-600">{formatMoney(item.revenue)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
         </div>

         <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-500">Total: <strong>{totalItems}</strong> registros</span>
            <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50"><ChevronLeft size={16} /></button>
                <span className="text-sm font-medium text-slate-700 px-2">{page} de {totalPages || 1}</span>
                <button onClick={() => setPage(p => (totalPages && p < totalPages ? p + 1 : p))} disabled={page >= totalPages || loading} className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
         </div>

      </div>
    </div>
  );
}
