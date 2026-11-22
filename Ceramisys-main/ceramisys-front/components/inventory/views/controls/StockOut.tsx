import React, { useState, useEffect, useRef } from 'react';
import { Save, ArrowUpCircle, User, Package, ClipboardList, Search, Filter, X, Loader2, ChevronLeft, ChevronRight, CheckCircle2, MessageSquare, Pencil, Undo2, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TableAction } from '@/components/ui/TableAction';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- TIPAGENS ---
interface Product {
  id: string;
  name: string;
  code: string;
  stockCurrent: number;
}

interface Employee {
  id: string;
  name: string;
  cpf: string;
}

interface ProductExit {
  id: string;
  productId: string;
  productName: string;
  employeeId: string;
  employeeName: string;
  quantity: number;
  returnedQuantity?: number;
  exitDate: string;
  isReturnable: boolean;
  observation?: string;
  insertedBy?: string;
}

// --- MODAL DE BUSCA (ATUALIZADA COM PAGINAÇÃO) ---
interface SearchModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fetchData: (params: Record<string, unknown>) => Promise<{ data?: { items?: T[]; totalItems?: number; totalCount?: number; count?: number } }>;
  onSelect: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
}

function SearchModal<T>({ isOpen, onClose, title, fetchData, onSelect, renderItem }: SearchModalProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // PAGINAÇÃO
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 5; 

  useEffect(() => {
    if (isOpen) { 
      loadData(); 
    } else { 
      setSearch(''); 
      setPage(1); 
      setItems([]); 
      setTotalItems(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, page]); 

  const loadData = async (termOverride?: string) => {
    setLoading(true);
    try {
      const term = termOverride !== undefined ? termOverride : search;
      
      const params = { 
        Page: page, 
        PageSize: pageSize, 
        Search: term, 
        OrderBy: 'Name', 
        Ascending: true 
      };

      const response = await fetchData(params);
      
      if (response.data) {
          const list = response.data.items || [];
          setItems(list);
          // Tenta ler o total de várias propriedades possíveis
          const total = response.data.totalItems ?? response.data.totalCount ?? response.data.count ?? 0;
          setTotalItems(total);
      } else {
          setItems([]);
          setTotalItems(0);
      }
    } catch (error) { 
      console.error("Erro modal", error); 
      setItems([]);
    } finally { 
      setLoading(false); 
    }
  };

  const handleSearchKey = (e: React.KeyboardEvent) => { 
    if (e.key === 'Enter') { 
      setPage(1); 
      loadData(); 
    } 
  };

  const totalPages = Math.ceil(totalItems / pageSize);
  // Fallback: se total for 0 mas a lista veio cheia, permite avançar
  const hasNextPage = page < totalPages || (totalItems === 0 && items.length === pageSize);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
        </div>
        
        {/* Busca */}
        <div className="p-4 border-b border-slate-100">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  autoFocus 
                  type="text" 
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Buscar..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  onKeyDown={handleSearchKey} 
                />
            </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50 min-h-[250px]">
            {loading ? (
                <div className="flex flex-col items-center justify-center p-8 text-blue-600 gap-2 h-full">
                    <Loader2 className="animate-spin" />
                    <span className="text-xs font-medium">Carregando...</span>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center p-8 text-slate-400 h-full flex items-center justify-center">
                    Nada encontrado.
                </div>
            ) : (
                items.map((item, idx) => (
                <div key={idx} onClick={() => { onSelect(item); onClose(); }} className="bg-white p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all flex items-center justify-between group">
                    <div className="flex-1">{renderItem(item)}</div>
                    <div className="opacity-0 group-hover:opacity-100 text-blue-600"><CheckCircle2 size={18}/></div>
                </div>
            )))}
        </div>

        {/* FOOTER - PAGINAÇÃO LARANJA CLARO */}
        <div className="p-3 border-t border-slate-100 flex justify-between items-center text-sm bg-white">
            <button 
                disabled={page === 1 || loading} 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                title="Página Anterior"
            >
                <ChevronLeft size={20} strokeWidth={2.5}/>
            </button>
            
            <span className="text-slate-500 font-medium bg-slate-50 px-3 py-1 rounded-full text-xs border border-slate-100">
                {totalItems > 0 
                  ? `Página ${page} de ${totalPages}` 
                  : (items.length > 0 ? `Página ${page}` : '-') 
                }
            </span>
            
            <button 
                disabled={!hasNextPage || loading} 
                onClick={() => setPage(p => p + 1)} 
                className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                title="Próxima Página"
            >
                <ChevronRight size={20} strokeWidth={2.5}/>
            </button>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL (STOCK OUT) ---
export function StockOut() {
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  
  // Estado de Edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Estados do Formulário
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [isReturnable, setIsReturnable] = useState('false');
  const [observation, setObservation] = useState('');

  // Modais
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Lista de Saídas
  const [exits, setExits] = useState<ProductExit[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchExits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchExits = async (isReset = false) => {
    setTableLoading(true);
    try {
      const params = {
        Page: isReset ? 1 : page,
        PageSize: pageSize,
        Search: isReset ? '' : searchTerm,
        OrderBy: 'ExitDate',
        Ascending: false
      };
      
      const response = await api.get('/api/products-exit/paged', { params });
      const data = response.data;

      if (data.items) { 
        setExits(data.items); 
        // Corrigido para totalItems também na tabela principal
        setTotalItems(data.totalItems ?? data.totalCount ?? 0); 
      }
      else if (Array.isArray(data)) { setExits(data); setTotalItems(data.length); }
      else { setExits([]); setTotalItems(0); }
    } catch (error) { console.error("Erro exits", error); } 
    finally { setTableLoading(false); }
  };

  // --- HANDLER DE EDIÇÃO ---
  const handleEdit = (exit: ProductExit) => {
    setEditingId(exit.id);
    
    // Popula estados simples
    setQuantity(exit.quantity.toString());
    setIsReturnable(exit.isReturnable ? 'true' : 'false');
    setObservation(exit.observation || '');

    // Popula objetos visuais
    setSelectedProduct({ 
        id: exit.productId, 
        name: exit.productName, 
        code: '---', 
        stockCurrent: 0 
    });
    
    setSelectedEmployee({ 
        id: exit.employeeId, 
        name: exit.employeeName, 
        cpf: '---' 
    });

    // Rola para o topo
    if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setSelectedProduct(null);
    setSelectedEmployee(null);
    setQuantity('');
    setObservation('');
    setIsReturnable('false');
  };

  // --- HANDLER SALVAR (POST/PUT) ---
  const handleSave = async () => {
    if (!selectedEmployee || !selectedProduct || !quantity) {
      alert("Preencha Funcionário, Produto e Quantidade.");
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      
      // Campos comuns
      payload.append('Quantity', quantity);
      payload.append('IsReturnable', isReturnable);
      payload.append('Observation', observation);

      if (editingId) {
        // --- PUT (Edição) ---
        payload.append('Id', editingId);
        await api.put('/api/products-exit', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        alert("Saída atualizada com sucesso!");
      } else {
        // --- POST (Criação) ---
        payload.append('ProductId', selectedProduct.id);
        payload.append('EmployeeId', selectedEmployee.id);
        
        await api.post('/api/products-exit', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        alert("Saída registrada com sucesso!");
      }
      
      handleCancelEdit(); // Limpa e reseta
      fetchExits(); 
    } catch (error) { 
      console.error("Erro save", error); 
      alert(getApiErrorMessage(error, 'Não foi possível salvar a saída.'));
    } finally { 
      setLoading(false); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta saída? O estoque será devolvido.")) {
      return;
    }
    try {
      await api.delete(`/api/products-exit/${id}`);
      alert("Saída cancelada com sucesso!");
      if (editingId === id) handleCancelEdit();
      fetchExits();
    } catch (error) {
      console.error("Erro ao deletar", error);
      alert(getApiErrorMessage(error, 'Não foi possível cancelar a saída.'));
    }
  };

  const handleFilter = () => { setPage(1); fetchExits(); };
  const handleClearFilters = () => { setSearchTerm(''); setPage(1); fetchExits(true); };

  const formatDate = (dateStr: string) => { if (!dateStr) return '-'; return new Date(dateStr).toLocaleDateString('pt-BR'); };
  const totalPages = Math.ceil(totalItems / pageSize);
  const inputClass = "w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900";

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ArrowUpCircle className="text-blue-600" /> Saída de Material</h1><p className="text-slate-500">Registre consumo ou retirada.</p></div>
      </div>
      
      {/* FORMULÁRIO DE SAÍDA */}
      <div 
        ref={formRef} 
        className={`rounded-xl shadow-sm border overflow-hidden transition-colors duration-300 ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${editingId ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'}`}>
                {editingId ? <Pencil size={20}/> : <ClipboardList size={20} />}
            </div>
            <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Saída' : 'Nova Saída'}</h2>
          </div>
          {editingId && (
            <button onClick={handleCancelEdit} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors">
              <X size={16} /> Cancelar Edição
            </button>
          )}
        </div>
        
        <div className="p-6 space-y-6">
          {/* Seletores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Seletor de Funcionário */}
            <div className={`flex items-center justify-between px-4 py-3 border rounded-lg transition-colors ${selectedEmployee ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-300'} ${editingId ? 'opacity-70 cursor-not-allowed' : ''}`}>
               <div className="flex items-center gap-3 overflow-hidden"><User size={18} className={selectedEmployee ? "text-blue-600" : "text-slate-500"} /> <div className="flex flex-col"><span className={`text-sm font-bold ${selectedEmployee ? "text-blue-900" : "text-slate-500 italic"}`}>{selectedEmployee ? selectedEmployee.name : "Selecionar Funcionário..."}</span></div></div>
               <div className="flex gap-2">
                   {!editingId && (
                       <>
                        {selectedEmployee && <button onClick={() => setSelectedEmployee(null)} className="p-1 hover:bg-white rounded-full text-red-500"><X size={16}/></button>}
                        <Button variant="soft" size="sm" onClick={() => setIsEmployeeModalOpen(true)}>BUSCAR</Button>
                       </>
                   )}
                   {editingId && <span className="text-xs font-bold text-slate-400 self-center">FIXO</span>}
               </div>
            </div>

            {/* Seletor de Produto */}
            <div className={`flex items-center justify-between px-4 py-3 border rounded-lg transition-colors ${selectedProduct ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-300'} ${editingId ? 'opacity-70 cursor-not-allowed' : ''}`}>
               <div className="flex items-center gap-3 overflow-hidden"><Package size={18} className={selectedProduct ? "text-blue-600" : "text-slate-500"} /> <div className="flex flex-col"><span className={`text-sm font-bold ${selectedProduct ? "text-blue-900" : "text-slate-500 italic"}`}>{selectedProduct ? selectedProduct.name : "Selecionar Produto..."}</span>{selectedProduct && !editingId && <span className="text-xs text-blue-600">Estoque Atual: {selectedProduct.stockCurrent}</span>}</div></div>
               <div className="flex gap-2">
                   {!editingId && (
                       <>
                        {selectedProduct && <button onClick={() => setSelectedProduct(null)} className="p-1 hover:bg-white rounded-full text-red-500"><X size={16}/></button>}
                        <Button variant="soft" size="sm" onClick={() => setIsProductModalOpen(true)}>BUSCAR</Button>
                       </>
                   )}
                   {editingId && <span className="text-xs font-bold text-slate-400 self-center">FIXO</span>}
               </div>
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Quantidade *</label>
                <input type="number" className={inputClass} value={quantity} onChange={e => setQuantity(e.target.value)} min="1" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Devolvível?</label>
                <select className={inputClass} value={isReturnable} onChange={e => setIsReturnable(e.target.value)}>
                    <option value="false">Não</option>
                    <option value="true">Sim</option>
                </select>
            </div>
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Observação</label>
                <div className="relative"><MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" className={`${inputClass} pl-10`} value={observation} onChange={e => setObservation(e.target.value)} placeholder="Detalhes da saída..." /></div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            {editingId && <Button variant="outline" icon={Undo2} onClick={handleCancelEdit}>CANCELAR</Button>}
            <Button variant="primary" icon={loading ? Loader2 : Save} onClick={handleSave} disabled={loading}>
                {loading ? 'PROCESSANDO...' : (editingId ? 'ATUALIZAR' : 'REGISTRAR SAÍDA')}
            </Button>
        </div>
      </div>
      
      {/* HISTÓRICO DE SAÍDAS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Histórico de Saídas</h2>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-slate-500 uppercase">Buscar</label>
                    <div className="relative mt-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" className={inputClass} placeholder="Produto ou Funcionário..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleFilter()} /></div>
                </div>
                <div className="flex gap-2 w-full md:w-auto"><Button variant="soft" icon={Filter} onClick={handleFilter}>FILTRAR</Button><Button variant="outline" icon={X} onClick={handleClearFilters}>LIMPAR</Button></div>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                    <tr>
                        <th className="p-4">Produto</th>
                        <th className="p-4">Funcionário</th>
                        <th className="p-4">Operador</th>
                        <th className="p-4 text-center">Qtd.</th>
                        <th className="p-4 text-center">Data</th>
                        <th className="p-4 text-center">Devolvível</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="text-sm text-slate-600">
                    {tableLoading ? (
                        <tr><td colSpan={7} className="p-8 text-center"><div className="flex justify-center gap-2 text-slate-500"><Loader2 className="animate-spin"/> Carregando...</div></td></tr>
                    ) : exits.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nenhuma saída encontrada.</td></tr>
                    ) : (
                        exits.map((exit) => (
                            <tr key={exit.id} className={`border-b border-slate-100 last:border-0 transition-colors ${editingId === exit.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                                <td className="p-4 font-bold text-slate-800">{exit.productName}</td>
                                <td className="p-4">{exit.employeeName}</td>
                                <td className="p-4 text-slate-600 flex items-center gap-2">
                                    <UserCircle size={16} className="text-slate-400" />
                                    {exit.insertedBy || 'Sistema'}
                                </td>
                                <td className="p-4 text-center font-bold text-blue-600">
                                    -{exit.quantity}
                                    {exit.returnedQuantity ? <span className="text-xs text-orange-500 block font-normal">({exit.returnedQuantity} dev.)</span> : null}
                                </td>
                                <td className="p-4 text-center text-slate-500">{formatDate(exit.exitDate)}</td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${exit.isReturnable ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {exit.isReturnable ? 'Sim' : 'Não'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <TableAction variant="edit" onClick={() => handleEdit(exit)} />
                                        <TableAction variant="delete" onClick={() => handleDelete(exit.id)} />
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-sm text-slate-500">Total: <strong>{totalItems}</strong> registros</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || tableLoading} className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"><ChevronLeft size={16} /></button>
            <span className="text-sm font-medium text-slate-700 px-2">Página {page} de {totalPages || 1}</span>
            <button onClick={() => setPage(p => (totalPages && p < totalPages ? p + 1 : p))} disabled={page >= totalPages || tableLoading} className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* --- MODAIS DE BUSCA --- */}
      <SearchModal<Employee> 
        isOpen={isEmployeeModalOpen} 
        onClose={() => setIsEmployeeModalOpen(false)} 
        title="Buscar Funcionário" 
        fetchData={(params) => api.get('/api/employees/pages', { params })} 
        onSelect={setSelectedEmployee} 
        renderItem={(emp) => (<div><p className="font-bold text-slate-800">{emp.name}</p><p className="text-xs text-slate-500">CPF: {emp.cpf}</p></div>)} 
      />
      
      <SearchModal<Product> 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        title="Buscar Produto" 
        fetchData={(params) => api.get('/api/products/paged', { params })} 
        onSelect={setSelectedProduct} 
        renderItem={(prod) => (<div><p className="font-bold text-slate-800">{prod.name}</p><p className="text-xs text-slate-500">Cód: {prod.code}</p></div>)} 
      />
    
    </div>
  );
}
