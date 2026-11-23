import React, { useState, useEffect, useRef } from 'react';
import { Layers, Save, Loader2, Trash2, Edit, Plus, FolderTree, Search, ChevronLeft, ChevronRight, Tag, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- INTERFACES ---
interface Category {
  id: string;
  name: string;
}

interface CategoryGroup {
  id: string;
  name: string;
  categories: Category[]; 
}

export function MainCategories() {
  // Estados de Loading
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Estado do Formulário
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null); // ID sendo editado
  
  // Estados da Lista e Paginação
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;
  const [searchTerm, setSearchTerm] = useState('');

  // Carregar dados
  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // --- GET (Listagem) ---
  const fetchGroups = async (isReset = false) => {
    setListLoading(true);
    try {
      const params = {
        Page: isReset ? 1 : page,
        PageSize: pageSize,
        Search: isReset ? '' : searchTerm
      };

      const response = await api.get('/api/financial/launch-category-groups/paged', { params });
      const data = response.data;

      if (data.items) {
        setGroups(data.items);
        setTotalItems(data.totalItems || 0);
      } else {
        setGroups([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error("Erro ao buscar grupos", error);
    } finally {
      setListLoading(false);
    }
  };

  // --- PREPARAR EDIÇÃO ---
  const handleEdit = (group: CategoryGroup) => {
    setEditingId(group.id);
    setName(group.name);
    // Foca no input para facilitar
    if (inputRef.current) {
        inputRef.current.focus();
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
  };

  // --- SALVAR (POST ou PUT) ---
  const handleSave = async () => {
    if (!name.trim()) {
      alert("Informe o nome do grupo.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('Name', name); 

      if (editingId) {
        // --- PUT (Atualizar) ---
        // O endpoint exige Id no body (multipart/form-data)
        formData.append('Id', editingId);

        await api.put('/api/financial/launch-category-groups', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Categoria atualizada com sucesso!");
        handleCancelEdit(); // Sai do modo edição
      } else {
        // --- POST (Criar) ---
        await api.post('/api/financial/launch-category-groups', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Categoria cadastrada com sucesso!");
        setName('');
      }

      fetchGroups(); // Recarrega lista
    } catch (error) {
      console.error("Erro ao salvar", error);
      alert(getApiErrorMessage(error, 'Não foi possível salvar o grupo.'));
    } finally {
      setLoading(false);
    }
  };

  // --- DELETE ---
  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este grupo?")) return;
    
    try {
        await api.delete('/api/financial/launch-category-groups', {
            data: { id: id }
        });
        
        alert("Grupo excluído com sucesso!");
        if (editingId === id) handleCancelEdit(); // Se estava editando o excluído, limpa
        fetchGroups();
    } catch (error) {
        console.error("Erro ao excluir", error);
        alert(getApiErrorMessage(error, 'Não foi possível excluir o grupo.'));
    }
  };

  // Handlers de UI
  const handleSearch = () => { setPage(1); fetchGroups(); };
  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Layers className="text-blue-600"/> Categorias Principais
            </h1>
            <p className="text-slate-500">Gerencie os grupos macro do seu plano de contas financeiro.</p>
        </div>
      </div>
      
      {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
      <div className={`bg-white rounded-xl shadow-sm border p-6 space-y-6 transition-all ${editingId ? 'border-orange-200 ring-1 ring-orange-100' : 'border-slate-200'}`}>
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                {editingId ? <Pencil size={18} className="text-orange-500"/> : <Plus size={18} className="text-blue-500"/>} 
                {editingId ? 'Editar Categoria Principal' : 'Nova Categoria Principal'}
            </h2>
            {editingId && (
                <button onClick={handleCancelEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
                    CANCELAR <X size={14}/>
                </button>
            )}
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-end">
           <div className="flex-1 w-full">
               <label className="text-sm font-semibold text-slate-700 mb-1 block">Nome do Grupo</label>
               <input 
                 ref={inputRef}
                 className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                 type="text" 
                 placeholder="Ex: Despesas Fixas, Receitas Operacionais..."
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSave()}
               />
           </div>
           <div className="flex gap-2 w-full md:w-auto">
               {editingId && (
                   <Button variant="outline" onClick={handleCancelEdit} disabled={loading}>
                       CANCELAR
                   </Button>
               )}
               <Button 
                 variant="primary" 
                 icon={loading ? Loader2 : Save} 
                 onClick={handleSave}
                 disabled={loading}
                 className="w-full md:w-auto"
               >
                 {loading ? 'SALVANDO...' : (editingId ? 'ATUALIZAR' : 'SALVAR')}
               </Button>
           </div>
        </div>
      </div>

      {/* LISTAGEM DE CATEGORIAS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <FolderTree size={18} className="text-slate-500"/> Grupos Cadastrados
            </h2>
            
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                    placeholder="Buscar grupo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-bold uppercase border-b border-slate-200">
                    <tr>
                        <th className="p-4">Nome do Grupo</th>
                        <th className="p-4 text-center">Subcategorias</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {listLoading ? (
                        <tr><td colSpan={3} className="p-8 text-center"><div className="flex justify-center gap-2"><Loader2 className="animate-spin"/> Carregando...</div></td></tr>
                    ) : groups.length === 0 ? (
                        <tr><td colSpan={3} className="p-8 text-center text-slate-500 italic">Nenhum grupo encontrado.</td></tr>
                    ) : (
                        groups.map((group) => (
                            <tr key={group.id} className={`transition-colors ${editingId === group.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                                <td className="p-4 font-bold text-slate-800">{group.name}</td>
                                <td className="p-4 text-center">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                        <Tag size={12} />
                                        {group.categories ? group.categories.length : 0}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" 
                                            title="Editar"
                                            onClick={() => handleEdit(group)}
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors" 
                                            title="Excluir"
                                            onClick={() => handleDelete(group.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
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
            <span className="text-sm text-slate-500">Total: <strong>{totalItems}</strong> registros</span>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1 || listLoading} 
                    className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-medium text-slate-700 px-2">
                    Pág. {page} de {totalPages || 1}
                </span>
                <button 
                    onClick={() => setPage(p => (totalPages && p < totalPages ? p + 1 : p))} 
                    disabled={page >= totalPages || listLoading} 
                    className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}
