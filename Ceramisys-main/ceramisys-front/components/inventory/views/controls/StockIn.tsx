import React, { useState, useEffect, useRef } from 'react';
import { Save, ArrowDownCircle, Truck, Package, Plus, Search, Filter, X, Loader2, ChevronLeft, ChevronRight, CheckCircle2, Pencil, Undo2, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TableAction } from '@/components/ui/TableAction';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- TIPAGENS ---
interface Product {
  id: string;
  name: string;
  code: string;
}

interface Supplier {
  id: string;
  name: string;
  cnpj: string;
}

interface Category {
  id: string;
  name: string;
}

interface ProductEntry {
  id: string;
  productId: string; 
  productName: string;
  categoryName?: string;
  supplierId?: string; 
  supplierName?: string;
  quantity: number;
  unitPrice: number;
  entryDate: string; 
  insertedBy?: string;
}

// --- COMPONENTE DE MODAL DE BUSCA (ATUALIZADO) ---
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
  const hasNextPage = page < totalPages;

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
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" 
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
                <div className="flex flex-col items-center justify-center p-8 text-emerald-600 gap-2 h-full">
                    <Loader2 className="animate-spin" />
                    <span className="text-xs font-medium">Carregando...</span>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center p-8 text-slate-400 h-full flex items-center justify-center">
                    Nada encontrado.
                </div>
            ) : (
                items.map((item, idx) => (
                <div key={idx} onClick={() => { onSelect(item); onClose(); }} className="bg-white p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer transition-all flex items-center justify-between group">
                    <div className="flex-1">{renderItem(item)}</div>
                    <div className="opacity-0 group-hover:opacity-100 text-emerald-600"><CheckCircle2 size={18}/></div>
                </div>
            )))}
        </div>

        {/* FOOTER - PAGINAÇÃO LARANJA CLARO */}
        <div className="p-3 border-t border-slate-100 flex justify-between items-center text-sm bg-white">
            <button 
                disabled={page === 1 || loading} 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                // AQUI ESTÃO AS CORES LARANJA CLARO
                className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                title="Anterior"
            >
                <ChevronLeft size={20} strokeWidth={2.5}/>
            </button>
            
            <span className="text-slate-500 font-medium bg-slate-50 px-3 py-1 rounded-full text-xs border border-slate-100">
                {totalItems > 0 
                  ? `Página ${page} de ${totalPages}` 
                  : '-'
                }
            </span>
            
            <button 
                disabled={!hasNextPage || loading} 
                onClick={() => setPage(p => p + 1)} 
                // AQUI ESTÃO AS CORES LARANJA CLARO
                className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                title="Próxima"
            >
                <ChevronRight size={20} strokeWidth={2.5}/>
            </button>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL (STOCK IN) ---
export function StockIn() {
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  
  // Estado de Edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [entries, setEntries] = useState<ProductEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchEntries(); }, [page]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data);
    } catch (error) { console.error("Erro categorias", error); }
  };

  const fetchEntries = async (isReset = false) => {
    setTableLoading(true);
    try {
      const params = {
        Page: isReset ? 1 : page,
        PageSize: pageSize,
        Search: isReset ? '' : searchTerm,
        CategoryId: (isReset || filterCategoryId === '') ? undefined : filterCategoryId,
        OrderBy: 'EntryDate',
        Ascending: false
      };
      const response = await api.get('/api/products-entry/paged', { params });
      const data = response.data;
      if (data.items) { 
        setEntries(data.items); 
        setTotalItems(data.totalItems ?? data.totalCount ?? 0); 
      }
      else if (Array.isArray(data)) { setEntries(data); setTotalItems(data.length); }
      else { setEntries([]); setTotalItems(0); }
    } catch (error) { console.error("Erro entries", error); } 
    finally { setTableLoading(false); }
  };

  // --- EDITAR ---
  const handleEdit = (entry: ProductEntry) => {
    setEditingId(entry.id);
    
    setSelectedProduct({ id: entry.productId, name: entry.productName, code: '---' });
    
    if (entry.supplierId) {
        setSelectedSupplier({ id: entry.supplierId, name: entry.supplierName || '', cnpj: '' });
    } else {
        setSelectedSupplier(null);
    }

    setQuantity(entry.quantity.toString());
    setUnitPrice(entry.unitPrice.toString());

    if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setSelectedProduct(null);
    setSelectedSupplier(null);
    setQuantity('');
    setUnitPrice('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta entrada?")) return;
    try {
      await api.delete(`/api/products-entry/${id}`);
      alert("Entrada cancelada!");
      if (editingId === id) handleCancelEdit();
      fetchEntries(); 
    } catch (error) { console.error("Erro delete", error); alert(getApiErrorMessage(error, 'Não foi possível cancelar a entrada.')); }
  };

  const handleSave = async () => {
    if (!selectedProduct || !quantity || !unitPrice) { alert("Preencha todos os campos."); return; }
    
    setLoading(true);
    try {
      const payload = new FormData();
      
      if (selectedSupplier) payload.append('SupplierId', selectedSupplier.id);
      payload.append('Quantity', quantity);
      payload.append('UnitPrice', unitPrice.replace(',', '.'));

      if (editingId) {
        payload.append('Id', editingId);
        await api.put('/api/products-entry', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        alert("Entrada atualizada!");
      } else {
        payload.append('ProductId', selectedProduct.id);
        await api.post('/api/products-entry', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        alert("Entrada registrada!");
      }

      handleCancelEdit(); 
      fetchEntries(); 
    } catch (error) { 
      console.error("Erro save", error); 
      alert(getApiErrorMessage(error, 'Não foi possível salvar a entrada.'));
    } finally { 
      setLoading(false); 
    }
  };

  const handleFilter = () => { setPage(1); fetchEntries(); };
  const handleClearFilters = () => { setSearchTerm(''); setFilterCategoryId(''); setPage(1); fetchEntries(true); };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateStr: string) => { if (!dateStr) return '-'; return new Date(dateStr).toLocaleDateString('pt-BR'); };
  const totalPages = Math.ceil(totalItems / pageSize);
  const inputClass = "w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900";

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ArrowDownCircle className="text-emerald-600" /> Entrada de Estoque</h1><p className="text-slate-500">Registre recebimento de mercadorias.</p></div>
      </div>
      
      {/* FORMULÁRIO */}
      <div 
        ref={formRef} 
        className={`rounded-xl shadow-sm border overflow-hidden transition-colors duration-300 ${editingId ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${editingId ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-600'}`}>
                {editingId ? <Pencil size={20}/> : <Plus size={20} />}
            </div>
            <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Entrada' : 'Nova Entrada'}</h2>
          </div>
          {editingId && (
            <button onClick={handleCancelEdit} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors">
              <X size={16} /> Cancelar Edição
            </button>
          )}
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Seletor de Fornecedor */}
            <div className={`flex items-center justify-between px-4 py-3 border rounded-lg transition-colors ${selectedSupplier ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-300'}`}>
               <div className="flex items-center gap-3 overflow-hidden"><Truck size={18} className={selectedSupplier ? "text-emerald-600" : "text-slate-500"} /> <div className="flex flex-col"><span className={`text-sm font-bold ${selectedSupplier ? "text-emerald-900" : "text-slate-500 italic"}`}>{selectedSupplier ? selectedSupplier.name : "Selecionar Fornecedor..."}</span></div></div>
               <div className="flex gap-2">{selectedSupplier && <button onClick={() => setSelectedSupplier(null)} className="p-1 hover:bg-white rounded-full text-red-500"><X size={16}/></button>}<Button variant="soft" size="sm" onClick={() => setIsSupplierModalOpen(true)}>BUSCAR</Button></div>
            </div>

            {/* Seletor de Produto */}
            <div className={`flex items-center justify-between px-4 py-3 border rounded-lg transition-colors ${selectedProduct ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-300'} ${editingId ? 'opacity-70 cursor-not-allowed' : ''}`}>
               <div className="flex items-center gap-3 overflow-hidden"><Package size={18} className={selectedProduct ? "text-emerald-600" : "text-slate-500"} /> <div className="flex flex-col"><span className={`text-sm font-bold ${selectedProduct ? "text-emerald-900" : "text-slate-500 italic"}`}>{selectedProduct ? selectedProduct.name : "Selecionar Produto..."}</span></div></div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Quantidade *</label><input type="number" className={inputClass} value={quantity} onChange={e => setQuantity(e.target.value)} min="1" /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Preço Custo (Unitário) *</label><input type="number" step="0.01" className={inputClass} value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0.00" /></div>
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            {editingId && <Button variant="outline" icon={Undo2} onClick={handleCancelEdit}>CANCELAR</Button>}
            <Button variant="primary" icon={loading ? Loader2 : Save} onClick={handleSave} disabled={loading}>{loading ? 'PROCESSANDO...' : (editingId ? 'ATUALIZAR' : 'REGISTRAR ENTRADA')}</Button>
        </div>
      </div>
      
      {/* HISTÓRICO - TABELA PRINCIPAL */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Histórico de Entradas</h2>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Buscar</label>
                        <div className="relative mt-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" className={inputClass} placeholder="Produto ou Fornecedor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleFilter()} /></div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                        <select className={`${inputClass} mt-1`} value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}><option value="">Todas</option>{categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}</select>
                    </div>
                </div>
                <div className="flex gap-2 pt-2 justify-end"><Button variant="outline" size="sm" icon={X} onClick={handleClearFilters}>LIMPAR</Button><Button variant="soft" size="sm" icon={Filter} onClick={handleFilter}>FILTRAR</Button></div>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                    <tr>
                        <th className="p-4">Produto</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4">Fornecedor</th>
                        <th className="p-4">Operador</th>
                        <th className="p-4 text-center">Qtd.</th>
                        <th className="p-4 text-right">Valor Unit.</th>
                        <th className="p-4 text-center">Data</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="text-sm text-slate-600">
                    {tableLoading ? (
                        <tr><td colSpan={8} className="p-8 text-center"><div className="flex justify-center gap-2 text-slate-500"><Loader2 className="animate-spin"/> Carregando...</div></td></tr>
                    ) : entries.length === 0 ? (
                        <tr><td colSpan={8} className="p-8 text-center text-slate-500">Nenhuma entrada encontrada.</td></tr>
                    ) : (
                        entries.map((entry) => (
                            <tr key={entry.id} className={`border-b border-slate-100 last:border-0 transition-colors ${editingId === entry.id ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                                <td className="p-4 font-bold text-slate-800">{entry.productName}</td>
                                <td className="p-4 text-slate-600 text-xs">{entry.categoryName || '-'}</td>
                                <td className={`p-4 ${!entry.supplierName && 'italic text-slate-400'}`}>{entry.supplierName || 'Sem Fornecedor'}</td>
                                <td className="p-4 text-slate-600 flex items-center gap-2">
                                    <UserCircle size={16} className="text-slate-400" />
                                    {entry.insertedBy || 'Sistema'}
                                </td>
                                <td className="p-4 text-center"><span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-bold text-xs">+{entry.quantity}</span></td>
                                <td className="p-4 text-right font-medium">{formatCurrency(entry.unitPrice)}</td>
                                <td className="p-4 text-center text-slate-500">{formatDate(entry.entryDate)}</td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <TableAction variant="edit" onClick={() => handleEdit(entry)} />
                                        <TableAction variant="delete" onClick={() => handleDelete(entry.id)} />
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

      {/* MODAIS */}
      <SearchModal<Product> 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        title="Buscar Produto" 
        fetchData={(params) => api.get('/api/products/paged', { params })} 
        onSelect={setSelectedProduct} 
        renderItem={(prod) => (<div><p className="font-bold text-slate-800">{prod.name}</p><p className="text-xs text-slate-500">Cód: {prod.code}</p></div>)} 
      />
      
      <SearchModal<Supplier> 
        isOpen={isSupplierModalOpen} 
        onClose={() => setIsSupplierModalOpen(false)} 
        title="Buscar Fornecedor" 
        fetchData={(params) => api.get('/api/supplier/paged', { params })} 
        onSelect={setSelectedSupplier} 
        renderItem={(sup) => (<div><p className="font-bold text-slate-800">{sup.name}</p><p className="text-xs text-slate-500">CNPJ: {sup.cnpj}</p></div>)} 
      />
    </div>
  );
}
