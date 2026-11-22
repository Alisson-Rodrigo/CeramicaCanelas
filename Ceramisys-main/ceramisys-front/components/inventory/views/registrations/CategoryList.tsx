import React, { useState, useEffect, ChangeEvent } from 'react';
import { Save, Tags, Layers, X, Loader2, Pencil, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TableAction } from '@/components/ui/TableAction';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// Tipagem da Categoria
interface Category {
  id: string;
  name: string;
  description: string;
}

export function CategoryList() {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Estado para controlar qual ID estamos editando
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estado do Formulário
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Buscar categorias ao carregar
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data);
    } catch (error) {
      console.error("Erro ao buscar categorias", error);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- EDITAR ---
  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  // --- EXCLUIR ---
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    try {
      await api.delete(`/api/categories/${id}`);
      alert("Categoria excluída com sucesso!");
      
      if (editingId === id) {
        handleCancelEdit();
      }
      
      fetchCategories(); 
    } catch (error) {
      console.error("Erro ao excluir", error);
      alert(getApiErrorMessage(error, 'Não foi possível excluir a categoria.'));
    }
  };

  // --- SALVAR (POST/PUT) ---
  const handleSubmit = async () => {
    if (!formData.name) {
      alert("O nome é obrigatório.");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('Name', formData.name);
      data.append('Description', formData.description);

      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
      };

      if (editingId) {
        data.append('Id', editingId); 
        await api.put('/api/categories', data, config);
        alert('Categoria atualizada com sucesso!');
      } else {
        await api.post('/api/categories', data, config);
        alert('Categoria criada com sucesso!');
      }
      
      handleCancelEdit(); 
      fetchCategories(); 

    } catch (error) {
      console.error("Erro ao salvar categoria", error);
      alert(getApiErrorMessage(error, 'Não foi possível salvar a categoria.'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400";

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Categorias</h1>
          <p className="text-slate-500">Organize os produtos.</p>
        </div>
      </div>

      {/* Formulário */}
      <div className={`rounded-xl shadow-sm border overflow-hidden transition-colors duration-300 ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${editingId ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
              {editingId ? <Pencil size={20} /> : <Tags size={20} />}
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {editingId ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>
          </div>
          
          {editingId && (
            <button 
              onClick={handleCancelEdit}
              className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors"
            >
              <X size={16} /> Cancelar Edição
            </button>
          )}
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nome</label>
              <input 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                type="text" 
                className={inputClass}
                placeholder="Ex: Matéria Prima"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
              <input 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                type="text" 
                className={inputClass}
                placeholder="Descrição opcional"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
          {editingId && (
            <Button variant="outline" icon={Undo2} onClick={handleCancelEdit}>
              CANCELAR
            </Button>
          )}
          <Button 
            variant="primary" 
            icon={loading ? Loader2 : Save} 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'PROCESSANDO...' : (editingId ? 'ATUALIZAR' : 'SALVAR')}
          </Button>
        </div>
      </div>
      
      {/* Lista */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Título da Lista (Sem filtros) */}
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Layers size={18} className="text-slate-500"/>
            Lista de Categorias
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Nome</th>
                <th className="p-4">Descrição</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-600">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">
                    Nenhuma categoria cadastrada.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className={`border-b border-slate-100 last:border-0 transition-colors ${editingId === cat.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                      <Layers size={16} className="text-blue-500" /> 
                      {cat.name}
                    </td>
                    <td className="p-4 text-slate-600">
                      {cat.description || '-'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <TableAction variant="edit" onClick={() => handleEdit(cat)} />
                        <TableAction variant="delete" onClick={() => handleDelete(cat.id)} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
