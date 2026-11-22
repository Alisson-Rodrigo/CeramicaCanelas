import React, { useState, useEffect } from 'react';
import { Filter, X, Undo2, Package, CheckCircle2, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TableAction } from '@/components/ui/TableAction';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// Interface atualizada
interface PendingExit {
  id: string;
  productName: string;
  employeeName: string;
  quantity: number;
  returnedQuantity?: number; // Pode vir nulo
  exitDate: string;
  isReturnable: boolean;
}

export function ProductReturns() {
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [items, setItems] = useState<PendingExit[]>([]);
  
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // ALTERAÇÃO CRÍTICA: Aumentado de 10 para 100.
  // Isso garante que puxamos um lote maior para encontrar pendências misturadas com itens concluídos.
  const pageSize = 100; 
  
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingExit | null>(null);
  const [quantityToReturn, setQuantityToReturn] = useState<number>(1);

  useEffect(() => {
    fetchPendingItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchPendingItems = async (isReset = false) => {
    setTableLoading(true);
    try {
      const params = {
        Page: isReset ? 1 : page,
        PageSize: pageSize,
        Search: isReset ? '' : searchTerm,
        OrderBy: 'ExitDate',
        Ascending: false // Traz os mais recentes primeiro
      };

      const response = await api.get('/api/products-exit/paged', { params });
      const data = response.data;

      let fetchedItems: PendingExit[] = [];
      if (data.items) fetchedItems = data.items;
      else if (Array.isArray(data)) fetchedItems = data;

      // Filtro no Front-end: Remove o que já foi devolvido
      const pendingOnly = fetchedItems.filter(item => {
        const returned = item.returnedQuantity ?? 0;
        return item.isReturnable === true && returned < item.quantity;
      });

      setItems(pendingOnly);
      
      // Ajuste visual do total para a paginação não ficar estranha
      setTotalItems(data.totalItems ?? pendingOnly.length); 

    } catch (error) {
      console.error("Erro ao buscar pendências", error);
    } finally {
      setTableLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar este registro de saída? O estoque será estornado.")) {
      return;
    }
    try {
      await api.delete(`/api/products-exit/${id}`);
      alert("Registro excluído com sucesso!");
      fetchPendingItems(); 
    } catch (error) {
      console.error("Erro ao excluir", error);
      alert(getApiErrorMessage(error, 'Não foi possível excluir o registro.'));
    }
  };

  const handleOpenModal = (item: PendingExit) => {
    setSelectedItem(item);
    const returned = item.returnedQuantity ?? 0;
    setQuantityToReturn(item.quantity - returned); 
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setQuantityToReturn(1);
  };

  const handleConfirmReturn = async () => {
    if (!selectedItem) return;
    
    const returned = selectedItem.returnedQuantity ?? 0;
    const remaining = selectedItem.quantity - returned;

    if (quantityToReturn <= 0 || quantityToReturn > remaining) {
      alert(`Quantidade inválida. O máximo permitido é ${remaining}.`);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('Id', selectedItem.id);
      formData.append('QuantityReturned', quantityToReturn.toString());

      await api.put('/api/products-exit/returned-products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert("Devolução registrada com sucesso!");
      handleCloseModal();
      fetchPendingItems();

    } catch (error) {
      console.error("Erro na devolução", error);
      alert(getApiErrorMessage(error, 'Não foi possível processar a devolução.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => { setPage(1); fetchPendingItems(); };
  const handleClear = () => { setSearchTerm(''); setPage(1); fetchPendingItems(true); };

  const formatDate = (dateStr: string) => {
      if (!dateStr) return '-';
      return new Date(dateStr).toLocaleDateString('pt-BR');
  };
  
  const inputClass = "w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder:text-slate-400";

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Undo2 className="text-orange-600" /> Devolução
          </h1>
          <p className="text-slate-500">Baixa de itens pendentes.</p>
        </div>
      </div>
      
      {/* BARRA DE FILTRO */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
         <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="lg:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Buscar</label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        className={inputClass} 
                        placeholder="Produto ou Colaborador..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleFilter()}
                    />
                  </div>
               </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="soft" size="sm" icon={Filter} onClick={handleFilter}>FILTRAR</Button>
              <Button variant="outline" size="sm" icon={X} onClick={handleClear}>LIMPAR</Button>
            </div>
         </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Itens Pendentes</h2>
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                {items.length} Visíveis
            </span>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                    <tr>
                        <th className="p-4">Produto</th>
                        <th className="p-4">Funcionário</th>
                        <th className="p-4 text-center">Qtd. Pendente</th>
                        <th className="p-4 text-center">Data Saída</th>
                        <th className="p-4 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="text-sm text-slate-600">
                    {tableLoading ? (
                        <tr><td colSpan={5} className="p-8 text-center"><div className="flex justify-center gap-2"><Loader2 className="animate-spin"/> Carregando...</div></td></tr>
                    ) : items.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum item pendente encontrado nesta página (Tente navegar ou buscar).</td></tr>
                    ) : (
                        items.map((item) => {
                            const returned = item.returnedQuantity ?? 0;
                            const remaining = item.quantity - returned;
                            
                            return (
                                <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                                    <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                                        <Package size={16} className="text-orange-600" /> 
                                        {item.productName}
                                    </td>
                                    <td className="p-4 font-medium">{item.employeeName}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-red-500 text-lg">{remaining}</span>
                                            <span className="text-xs text-slate-400">de {item.quantity} originais</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center text-slate-500">{formatDate(item.exitDate)}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                variant="primary" 
                                                size="sm" 
                                                icon={CheckCircle2} 
                                                onClick={() => handleOpenModal(item)}
                                            >
                                                DEVOLVER
                                            </Button>
                                            <TableAction 
                                                variant="delete" 
                                                onClick={() => handleDelete(item.id)} 
                                            />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>

        {/* PAGINAÇÃO LARANJA */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-500">Total: <strong>{totalItems}</strong> registros</span>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1 || tableLoading} 
                    className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-medium text-slate-700 px-2">{page}</span>
                <button 
                    onClick={() => setPage(p => p + 1)} 
                    // Logica de disable: Se vier menos que o pageSize, é a última
                    disabled={items.length < pageSize || tableLoading} 
                    className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
      </div>

      {/* --- MODAL DE CONFIRMAÇÃO --- */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Confirmar Devolução</h3>
                    <button onClick={handleCloseModal} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                        <p className="text-sm text-orange-800 font-medium">Produto: <span className="font-bold">{selectedItem.productName}</span></p>
                        <p className="text-sm text-orange-800">Funcionário: {selectedItem.employeeName}</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Quantidade a Devolver</label>
                        <input 
                            type="number" 
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold text-center text-slate-900"
                            value={quantityToReturn}
                            onChange={e => setQuantityToReturn(Number(e.target.value))}
                            min="1"
                            max={selectedItem.quantity - (selectedItem.returnedQuantity ?? 0)}
                        />
                        <p className="text-xs text-slate-500 mt-1 text-center">
                            Máximo Pendente: <strong>{selectedItem.quantity - (selectedItem.returnedQuantity ?? 0)}</strong>
                        </p>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <Button variant="outline" onClick={handleCloseModal}>CANCELAR</Button>
                    <Button 
                        variant="primary" 
                        icon={loading ? Loader2 : CheckCircle2} 
                        onClick={handleConfirmReturn} 
                        disabled={loading}
                    >
                        {loading ? 'CONFIRMANDO...' : 'CONFIRMAR DEVOLUÇÃO'}
                    </Button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
