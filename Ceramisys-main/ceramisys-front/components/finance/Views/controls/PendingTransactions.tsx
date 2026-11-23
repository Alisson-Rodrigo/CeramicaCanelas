import React, { useState, useEffect } from 'react';
import { Clock, Filter, CheckCircle2, X, ArrowUpCircle, ArrowDownCircle, Loader2, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- ENUMS E HELPERS ---
enum LaunchType {
  Income = 1,
  Expense = 2
}

const PaymentMethodDescriptions: Record<number, string> = {
  0: "Dinheiro", 1: "CXPJ", 2: "BBJ", 3: "BBJN", 4: "CHEQUE", 5: "BradescoPJ", 6: "CXJ", 7: "Débito Automático"
};

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('pt-BR') : '-';

// --- INTERFACES ---
interface PendingItem {
  id: string;
  description: string;
  dueDate: string;
  amount: number;
  type: number;
  customerName?: string;
  categoryName?: string;
}

export function PendingTransactions() {
  // --- ESTADOS ---
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Paginação
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Filtros
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal de Pagamento
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  
  // (Mantive os estados visuais caso queira exibir, mas não serão enviados na API se não solicitados)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('0');

  // --- EFEITOS ---
  useEffect(() => {
    fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // --- API: BUSCAR PENDÊNCIAS ---
  const fetchPending = async (isReset = false) => {
    setLoading(true);
    try {
        const params = {
            Page: isReset ? 1 : page,
            PageSize: pageSize,
            Type: (isReset ? '' : typeFilter) || undefined,
            StartDate: (isReset ? '' : startDate) || undefined,
            EndDate: (isReset ? '' : endDate) || undefined,
        };

        const response = await api.get('/api/financial/dashboard-financial/summary/pending', { params });
        
        if (response.data.items) {
            setItems(response.data.items);
            setTotalItems(response.data.totalItems || 0);
        } else {
            setItems([]);
            setTotalItems(0);
        }
    } catch (error) {
        console.error("Erro ao buscar pendências", error);
    } finally {
        setLoading(false);
    }
  };

  // --- AÇÃO: ABRIR MODAL ---
  const handleOpenPayModal = (item: PendingItem) => {
      setSelectedItem(item);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPayModalOpen(true);
  };

  // --- AÇÃO: CONFIRMAR PAGAMENTO (PUT SIMPLES) ---
  const handleConfirmPay = async () => {
      if (!selectedItem) return;

      setActionLoading(true);
      try {
          // Endpoint: PUT /api/financial/launch/{id}/mark-paid
          // Apenas chama a URL com o ID. Sem body e sem params adicionais (valor, data, etc).
          await api.put(`/api/financial/launch/${selectedItem.id}/mark-paid`);

          alert("Baixa realizada com sucesso!");
          setPayModalOpen(false);
          setSelectedItem(null);
          fetchPending(); // Atualiza a lista
      } catch (error) {
          console.error("Erro ao pagar", error);
          alert(getApiErrorMessage(error, 'Não foi possível realizar a baixa.'));
      } finally {
          setActionLoading(false);
      }
  };

  // --- HELPERS UI ---
  const handleFilter = () => { setPage(1); fetchPending(); };
  const handleClear = () => { setTypeFilter(''); setStartDate(''); setEndDate(''); setPage(1); fetchPending(true); };

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Clock className="text-orange-600"/> Contas Pendentes
            </h1>
            <p className="text-slate-500">Visualize e dê baixa em lançamentos a vencer ou vencidos.</p>
        </div>
      </div>
      
      {/* --- FILTROS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
             
             {/* Filtro Tipo */}
             <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tipo</label>
                 <select 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none text-sm bg-white"
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                 >
                     <option value="">Todos</option>
                     <option value="1">Receitas (A Receber)</option>
                     <option value="2">Despesas (A Pagar)</option>
                 </select>
             </div>

             <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Vencimento De</label>
                 <input className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none text-sm" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
             </div>
             <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Vencimento Até</label>
                 <input className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none text-sm" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
             </div>
             
             <div className="flex gap-2">
                <Button variant="outline" icon={X} onClick={handleClear}>Limpar</Button>
                <Button variant="soft" icon={Filter} onClick={handleFilter}>Filtrar</Button>
             </div>
         </div>
      </div>

      {/* --- TABELA --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                    <tr>
                        <th className="p-4 text-center">Tipo</th>
                        <th className="p-4">Descrição</th>
                        <th className="p-4 text-center">Vencimento</th>
                        <th className="p-4 text-right">Valor</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin inline text-blue-500"/> Carregando...</td></tr>
                    ) : items.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Nenhuma pendência encontrada.</td></tr>
                    ) : (
                        items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 text-center">
                                    {item.type === LaunchType.Income ? (
                                        <span title="Receita" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600"><ArrowUpCircle size={18}/></span>
                                    ) : (
                                        <span title="Despesa" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600"><ArrowDownCircle size={18}/></span>
                                    )}
                                </td>
                                <td className="p-4 font-bold text-slate-800">
                                    {item.description}
                                    <div className="text-xs font-normal text-slate-500 flex flex-col">
                                        {item.customerName && <span>Cli: {item.customerName}</span>}
                                        {item.categoryName && <span>Cat: {item.categoryName}</span>}
                                    </div>
                                </td>
                                <td className="p-4 text-center font-mono text-slate-600">
                                    {formatDate(item.dueDate)}
                                </td>
                                <td className={`p-4 text-right font-bold ${item.type === LaunchType.Income ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatMoney(item.amount)}
                                </td>
                                <td className="p-4 text-center">
                                    <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">
                                        Pendente
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                                        onClick={() => handleOpenPayModal(item)}
                                    >
                                        <CheckCircle2 size={16} className="mr-1"/> BAIXAR
                                    </Button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
             </table>
         </div>
      </div>

      {/* --- MODAL DE CONFIRMAÇÃO --- */}
      {payModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Banknote className="text-emerald-600" size={20}/> Confirmar Baixa
                    </h3>
                    <button onClick={() => setPayModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="text-center mb-6">
                        <p className="text-sm text-slate-500">Confirmar pagamento de:</p>
                        <p className="font-bold text-lg text-slate-800 mt-1">{selectedItem.description}</p>
                        <p className={`font-bold text-2xl mt-2 ${selectedItem.type === LaunchType.Income ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatMoney(selectedItem.amount)}
                        </p>
                    </div>
                    
                    {/* Campos visuais apenas para conferência do usuário, se desejar remover, basta apagar este bloco */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Vencimento:</span>
                            <span className="font-medium">{formatDate(selectedItem.dueDate)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Data Baixa:</span>
                            <span className="font-medium">{formatDate(paymentDate)}</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setPayModalOpen(false)}>Cancelar</Button>
                    <Button 
                        variant="primary" 
                        icon={actionLoading ? Loader2 : CheckCircle2}
                        onClick={handleConfirmPay}
                        disabled={actionLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                    >
                        {actionLoading ? 'Processando...' : 'CONFIRMAR'}
                    </Button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
