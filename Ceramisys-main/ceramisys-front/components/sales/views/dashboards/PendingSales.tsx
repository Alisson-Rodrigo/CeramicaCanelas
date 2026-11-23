import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Clock, User, DollarSign, Loader2, Banknote, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- ENUMS E HELPERS ---
const PaymentMethodDescriptions: Record<number, string> = {
  0: "Dinheiro", 1: "CXPJ", 2: "BBJ", 3: "BBJN", 4: "CHEQUE", 5: "BradescoPJ", 6: "CXJ", 7: "Débito Automático"
};

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// CORREÇÃO 1: Formata data ignorando fuso horário (apenas string)
const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const cleanDate = dateStr.split('T')[0]; 
    const [year, month, day] = cleanDate.split('-');
    return `${day}/${month}/${year}`;
};

// CORREÇÃO 2: Pega data de hoje localmente (YYYY-MM-DD)
const getTodayLocal = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- INTERFACES ---
interface PendingSale {
  id: string;
  noteNumber: number;
  saleDate: string;
  customerName: string;
  totalNet: number;        
  totalPaid: number;       
  remainingBalance: number; 
  status: number;          
}

export function PendingSales() {
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Dados da Lista
  const [items, setItems] = useState<PendingSale[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- ESTADOS DO MODAL DE PAGAMENTO ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<PendingSale | null>(null);
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('0');
  
  // CORREÇÃO 3: Inicializa com a data local correta
  const [paymentDate, setPaymentDate] = useState(getTodayLocal());

  // --- EFEITOS ---
  useEffect(() => {
    fetchPendingSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // --- API GET ---
  const fetchPendingSales = async (isReset = false) => {
    setLoading(true);
    try {
      const params = {
        Page: isReset ? 1 : page,
        PageSize: pageSize,
        Search: isReset ? '' : searchTerm,
        StartDate: isReset ? '' : startDate,
        EndDate: isReset ? '' : endDate,
      };

      const response = await api.get('/api/sales/pending/paged', { params });
      const data = response.data;

      if (data.items) {
        setItems(data.items);
        setTotalItems(data.totalItems || 0);
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

  // --- HANDLERS DO MODAL ---
  const handleOpenPaymentModal = (sale: PendingSale) => {
    setSelectedSale(sale);
    setAmountToPay(sale.remainingBalance); // Sugere pagar o restante
    setPaymentMethod('0');
    // Garante que ao abrir o modal a data seja hoje
    setPaymentDate(getTodayLocal());
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSale(null);
    setAmountToPay(0);
  };

  // --- CONFIRMAR PAGAMENTO (POST) ---
  const handleConfirmPayment = async () => {
    if (!selectedSale) return;
    
    if (amountToPay <= 0) {
        alert("O valor deve ser maior que zero.");
        return;
    }
    if (amountToPay > selectedSale.remainingBalance) {
        alert("O valor não pode ser maior que o saldo devedor.");
        return;
    }

    setPaymentLoading(true);
    try {
        // FormData para multipart/form-data
        const formData = new FormData();
        formData.append('SaleId', selectedSale.id);
        formData.append('Amount', amountToPay.toString()); 
        formData.append('PaymentMethod', paymentMethod);   
        formData.append('PaymentDate', paymentDate);

        // USANDO POST AGORA
        await api.post('/api/sales/pay-pending', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        alert("Pagamento registrado com sucesso!");
        handleCloseModal();
        fetchPendingSales(); // Atualiza a lista
    } catch (error) {
        console.error("Erro ao pagar", error);
        alert(getApiErrorMessage(error, 'Não foi possível registrar o pagamento.'));
    } finally {
        setPaymentLoading(false);
    }
  };

  // --- HELPERS UI ---
  const handleFilter = () => { setPage(1); fetchPendingSales(); };
  const handleClearFilters = () => { setSearchTerm(''); setStartDate(''); setEndDate(''); setPage(1); fetchPendingSales(true); };
  const totalPages = Math.ceil(totalItems / pageSize);

  const inputClass = "w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm";

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Clock className="text-orange-600"/> Vendas Pendentes
            </h1>
            <p className="text-slate-500">Gerencie recebimentos em aberto e pagamentos parciais.</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Filtros */}
        <div className="p-6 border-b border-slate-200">
           <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                  <label className="text-xs font-bold text-slate-500 uppercase">Buscar Cliente</label>
                  <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900" 
                        placeholder="Nome do cliente..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleFilter()}
                      />
                  </div>
              </div>
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Data Início</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none mt-1 text-slate-900" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                  <Button variant="soft" icon={Filter} onClick={handleFilter}>FILTRAR</Button>
                  <Button variant="outline" icon={X} onClick={handleClearFilters}>LIMPAR</Button>
              </div>
           </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                <tr>
                    <th className="p-4">Cliente</th>
                    <th className="p-4 text-center">Data Venda</th>
                    <th className="p-4 text-center">Valor Total</th>
                    <th className="p-4 text-center">Já Pago</th>
                    <th className="p-4 text-center">Restante</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="text-sm text-slate-600">
                {loading ? (
                    <tr><td colSpan={7} className="p-8 text-center"><div className="flex justify-center gap-2"><Loader2 className="animate-spin"/> Carregando...</div></td></tr>
                ) : items.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nenhuma venda pendente encontrada.</td></tr>
                ) : (
                    items.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                            <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                                <User size={16} className="text-slate-400"/> {sale.customerName}
                                <span className="text-xs font-normal text-slate-400 ml-1">#{sale.noteNumber}</span>
                            </td>
                            <td className="p-4 text-center">{formatDate(sale.saleDate)}</td>
                            <td className="p-4 text-center font-bold text-slate-800">{formatMoney(sale.totalNet)}</td>
                            <td className="p-4 text-center text-emerald-600">{formatMoney(sale.totalPaid)}</td>
                            <td className="p-4 text-center font-bold text-red-600 bg-red-50/50 rounded flex items-center justify-center gap-1">
                                {formatMoney(sale.remainingBalance)}
                            </td>
                            <td className="p-4 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 w-fit mx-auto ${sale.status === 1 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {sale.status === 1 ? 'Parcial' : 'Pendente'}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <Button 
                                        variant="primary" 
                                        size="sm" 
                                        icon={Banknote} 
                                        onClick={() => handleOpenPaymentModal(sale)}
                                    >
                                        RECEBER
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-500">Total: <strong>{totalItems}</strong> pendências</span>
            <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50"><ChevronLeft size={16} /></button>
                <span className="text-sm font-medium text-slate-700 px-2">{page} de {totalPages || 1}</span>
                <button onClick={() => setPage(p => (totalPages && p < totalPages ? p + 1 : p))} disabled={page >= totalPages || loading} className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
        </div>
      </div>

      {/* --- MODAL DE PAGAMENTO --- */}
      {isModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Banknote className="text-emerald-600" size={20}/> Registrar Recebimento
                    </h3>
                    <button onClick={handleCloseModal} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-5">
                    {/* Resumo da Dívida */}
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg space-y-1">
                        <p className="text-sm text-orange-800">Cliente: <span className="font-bold">{selectedSale.customerName}</span></p>
                        <div className="flex justify-between items-center pt-2 border-t border-orange-200/50 mt-2">
                            <span className="text-sm text-orange-700">Saldo Devedor:</span>
                            <span className="text-lg font-bold text-red-600">{formatMoney(selectedSale.remainingBalance)}</span>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor a Pagar</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                            <input 
                                type="number" 
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-xl font-bold text-emerald-700" 
                                value={amountToPay}
                                onChange={e => setAmountToPay(Number(e.target.value))}
                                max={selectedSale.remainingBalance}
                            />
                        </div>
                        {amountToPay < selectedSale.remainingBalance && amountToPay > 0 && (
                            <p className="text-xs text-orange-600 mt-1 font-medium">Pagamento Parcial. Restará: {formatMoney(selectedSale.remainingBalance - amountToPay)}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método de Pagamento</label>
                        <select className={inputClass} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                            {Object.entries(PaymentMethodDescriptions).map(([id, label]) => (
                                <option key={id} value={id}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data do Pagamento</label>
                        <input type="date" className={inputClass} value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <Button variant="outline" onClick={handleCloseModal}>CANCELAR</Button>
                    <Button 
                        variant="primary" 
                        icon={paymentLoading ? Loader2 : CheckCircle2} 
                        onClick={handleConfirmPayment}
                        disabled={paymentLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                    >
                        {paymentLoading ? 'PROCESSANDO...' : 'CONFIRMAR RECEBIMENTO'}
                    </Button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
