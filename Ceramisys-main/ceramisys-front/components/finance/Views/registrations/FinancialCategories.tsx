import React, { useState, useEffect } from 'react';
import { Save, Search, Tags, Loader2, Edit, Trash2, Plus, FolderInput, X, Check, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- INTERFACES ---

interface CategoryGroup {
  id: string;
  name: string;
}

interface LaunchCategory {
  id: string;
  name: string;
  nameGroupCategory: string | null; 
  idGroupCategory: string | null;   
}

// --- COMPONENTE DE MODAL DE BUSCA (COM PAGINAÇÃO) ---
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
        Search: term
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
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
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
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

// --- COMPONENTE PRINCIPAL ---
export function FinancialCategories() {
  // --- ESTADOS GERAIS ---
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  
  // --- ESTADOS DO FORMULÁRIO ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroup | null>(null);

  // --- ESTADOS DA LISTA (Categorias) ---
  const [categories, setCategories] = useState<LaunchCategory[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;
  const [searchTerm, setSearchTerm] = useState('');

  // --- ESTADO DO MODAL (Seleção de Grupo) ---
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Carregar lista principal ao iniciar
  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // --- API: LISTAR CATEGORIAS ---
  const fetchCategories = async (isReset = false) => {
    setListLoading(true);
    try {
      const params = {
        Page: isReset ? 1 : page,
        PageSize: pageSize,
        Search: isReset ? '' : searchTerm
      };
      
      const response = await api.get('/api/financial/launch-categories/paged', { params });
      
      if (response.data.items) {
        setCategories(response.data.items);
        setTotalItems(response.data.totalItems || 0);
      } else {
        setCategories([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error("Erro ao buscar categorias", error);
    } finally {
      setListLoading(false);
    }
  };

  // --- HANDLERS DE AÇÃO ---

  const handleSave = async () => {
    if (!name.trim()) { alert("Informe o nome da categoria."); return; }
    if (!selectedGroup) { alert("Selecione um Grupo Principal."); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('Name', name);
      formData.append('GroupId', selectedGroup.id);

      if (editingId) {
        // PUT
        formData.append('Id', editingId);
        await api.put('/api/financial/launch-categories', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Categoria atualizada!");
        handleCancelEdit();
      } else {
        // POST
        await api.post('/api/financial/launch-categories', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Categoria criada!");
        setName('');
        // setSelectedGroup(null); 
      }
      
      fetchCategories();
    } catch (error) {
      console.error("Erro ao salvar", error);
      alert(getApiErrorMessage(error, 'Não foi possível salvar a categoria.'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cat: LaunchCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    
    if (cat.idGroupCategory && cat.nameGroupCategory) {
        setSelectedGroup({ 
            id: cat.idGroupCategory, 
            name: cat.nameGroupCategory 
        });
    } else {
        setSelectedGroup(null); 
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir esta categoria?")) return;
    try {
        await api.delete(`/api/financial/launch-categories/${id}`);
        fetchCategories();
        if (editingId === id) handleCancelEdit();
    } catch (error) {
        console.error("Erro ao excluir", error);
        alert(getApiErrorMessage(error, 'Não foi possível excluir a categoria.'));
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setSelectedGroup(null);
  };

  const handleSearchMain = () => { setPage(1); fetchCategories(); };
  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Tags className="text-blue-600"/> Categorias Financeiras
            </h1>
            <p className="text-slate-500">Subcategorias vinculadas aos Grupos Principais.</p>
        </div>
      </div>
      
      {/* FORMULÁRIO */}
      <div className={`bg-white rounded-xl shadow-sm border p-6 space-y-6 transition-all ${editingId ? 'border-orange-200 ring-1 ring-orange-100' : 'border-slate-200'}`}>
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                {editingId ? <Edit size={18} className="text-orange-500"/> : <Plus size={18} className="text-blue-500"/>}
                {editingId ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>
            {editingId && <button onClick={handleCancelEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">CANCELAR <X size={14}/></button>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Nome da Categoria</label>
                <input 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    type="text" 
                    placeholder="Ex: Gasolina, Aluguel..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
            </div>

            {/* Grupo Principal (Abre Modal) */}
            <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Grupo Principal</label>
                <div 
                    onClick={() => setIsModalOpen(true)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 flex justify-between items-center transition-colors group"
                >
                    <span className={selectedGroup ? "text-slate-800 font-medium" : "text-slate-400"}>
                        {selectedGroup ? selectedGroup.name : "Selecione o grupo..."}
                    </span>
                    <FolderInput size={18} className="text-slate-400 group-hover:text-blue-500"/>
                </div>
            </div>
        </div>
        
        <div className="flex justify-end">
            <Button 
                variant="primary" 
                icon={loading ? Loader2 : Save} 
                onClick={handleSave}
                disabled={loading}
            >
                {loading ? 'SALVANDO...' : (editingId ? 'ATUALIZAR' : 'SALVAR')}
            </Button>
        </div>
      </div>

      {/* LISTAGEM */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="font-bold text-slate-700">Categorias Cadastradas</h2>
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2 text-slate-400" size={18}/>
                <input 
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchMain()}
                />
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                    <tr>
                        <th className="p-4">Nome</th>
                        <th className="p-4">Grupo Principal</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {listLoading ? (
                        <tr><td colSpan={3} className="p-8 text-center"><div className="flex justify-center gap-2"><Loader2 className="animate-spin"/> Carregando...</div></td></tr>
                    ) : categories.length === 0 ? (
                        <tr><td colSpan={3} className="p-8 text-center text-slate-500 italic">Nenhuma categoria encontrada.</td></tr>
                    ) : (
                        categories.map((cat) => (
                            <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-bold text-slate-800">{cat.name}</td>
                                <td className="p-4">
                                    {cat.nameGroupCategory ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                            <FolderInput size={12}/> 
                                            {cat.nameGroupCategory}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400 text-xs italic">Sem categoria principal</span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(cat)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16}/></button>
                                        <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
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
            <span className="text-sm text-slate-500">Total: <strong>{totalItems}</strong></span>
            <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || listLoading} className="p-2 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={16}/></button>
                <span className="text-sm px-2">Pág. {page} de {totalPages || 1}</span>
                <button onClick={() => setPage(p => (totalPages && p < totalPages ? p + 1 : p))} disabled={page >= totalPages || listLoading} className="p-2 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={16}/></button>
            </div>
        </div>
      </div>

      {/* --- MODAL DE SELEÇÃO DE GRUPO (COM PAGINAÇÃO) --- */}
      <SearchModal<CategoryGroup> 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Selecionar Grupo Principal" 
        fetchData={(params) => api.get('/api/financial/launch-category-groups/paged', { params })} 
        onSelect={setSelectedGroup} 
        renderItem={(group) => (<div className="font-bold text-slate-800">{group.name}</div>)} 
      />

    </div>
  );
}
