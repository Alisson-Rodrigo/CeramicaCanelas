import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { Save, Search, Truck, Building2, Phone, Filter, X, Mail, MapPin, Loader2, Pencil, Trash2, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TableAction } from '@/components/ui/TableAction';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// Interface do Fornecedor
interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
}

export function SupplierList() {
  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Ref para rolagem automática
  const formRef = useRef<HTMLDivElement>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Paginação e Filtro
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 10;

  // Formulário
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    phone: '',
    email: '',
    address: ''
  });

  // --- EFEITOS ---
  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // --- API ---
  const fetchSuppliers = async (termOverride?: string) => {
    const term = termOverride !== undefined ? termOverride : searchTerm;
    setTableLoading(true);
    try {
      // Assumindo o padrão /paged. Se for lista simples, mude para /api/supplier
      const response = await api.get('/api/supplier/paged', {
        params: {
          Page: page,
          PageSize: pageSize,
          Search: term,
          OrderBy: 'Name',
          Ascending: true
        }
      });

      const data = response.data;
      
      if (data.items) {
        setSuppliers(data.items);
        setTotalItems(data.totalCount || 0);
      } else if (Array.isArray(data)) {
        setSuppliers(data);
        setTotalItems(data.length);
      } else {
        setSuppliers([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error("Erro ao buscar fornecedores", error);
    } finally {
      setTableLoading(false);
    }
  };

  // --- HANDLERS (Busca) ---
  const handleSearch = () => {
    setPage(1);
    fetchSuppliers();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(1);
    fetchSuppliers('');
  };

  // --- HANDLERS (Formulário) ---
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setFormData({
      name: supplier.name,
      cnpj: supplier.cnpj,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || ''
    });

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', cnpj: '', phone: '', email: '', address: '' });
  };

  // --- AÇÕES CRUD ---
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este fornecedor?")) return;

    try {
      await api.delete(`/api/supplier/${id}`);
      alert("Fornecedor excluído com sucesso!");
      
      if (editingId === id) handleCancelEdit();
      fetchSuppliers();
    } catch (error) {
      console.error("Erro ao excluir", error);
      alert(getApiErrorMessage(error, 'Não foi possível excluir o fornecedor.'));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.cnpj) {
      alert("Nome e CNPJ são obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('Name', formData.name);
      data.append('Cnpj', formData.cnpj);
      data.append('Phone', formData.phone);
      data.append('Email', formData.email);
      data.append('Address', formData.address);

      if (editingId) data.append('Id', editingId);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (editingId) {
        await api.put('/api/supplier', data, config);
        alert('Fornecedor atualizado com sucesso!');
      } else {
        await api.post('/api/supplier', data, config);
        alert('Fornecedor cadastrado com sucesso!');
      }

      handleCancelEdit();
      fetchSuppliers();
    } catch (error) {
      console.error("Erro ao salvar", error);
      alert(getApiErrorMessage(error, 'Não foi possível salvar o fornecedor.'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400";
  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fornecedores</h1>
          <p className="text-slate-500">Gestão de parceiros.</p>
        </div>
      </div>

      {/* --- FORMULÁRIO --- */}
      <div 
        ref={formRef} 
        className={`rounded-xl shadow-sm border overflow-hidden transition-colors duration-300 ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${editingId ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
              {editingId ? <Pencil size={20} /> : <Truck size={20} />}
            </div>
            <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
          </div>
          {editingId && (
            <button onClick={handleCancelEdit} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors">
              <X size={16} /> Cancelar Edição
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Linha 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nome *</label>
              <input name="name" value={formData.name} onChange={handleInputChange} type="text" className={inputClass} placeholder="Razão Social ou Nome Fantasia" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">CNPJ *</label>
              <input name="cnpj" value={formData.cnpj} onChange={handleInputChange} type="text" className={inputClass} placeholder="00.000.000/0000-00" />
            </div>
          </div>

          {/* Linha 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Telefone</label>
              <input name="phone" value={formData.phone} onChange={handleInputChange} type="text" className={inputClass} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
              <input name="email" value={formData.email} onChange={handleInputChange} type="email" className={inputClass} placeholder="contato@empresa.com" />
            </div>
          </div>

          {/* Linha 3 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Endereço</label>
            <input name="address" value={formData.address} onChange={handleInputChange} type="text" className={inputClass} placeholder="Rua, Número, Bairro, Cidade - UF" />
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
          {editingId && <Button variant="outline" icon={Undo2} onClick={handleCancelEdit}>CANCELAR</Button>}
          <Button variant="primary" icon={loading ? Loader2 : Save} onClick={handleSubmit} disabled={loading}>
            {loading ? 'SALVANDO...' : (editingId ? 'ATUALIZAR' : 'SALVAR')}
          </Button>
        </div>
      </div>
      
      {/* --- LISTA --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs font-bold text-slate-500 uppercase">Buscar</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  className={inputClass}
                  placeholder="Nome ou CNPJ..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="soft" icon={Filter} onClick={handleSearch}>FILTRAR</Button>
              {searchTerm && <Button variant="outline" icon={X} onClick={handleClearSearch}>LIMPAR</Button>}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Empresa</th>
                <th className="p-4">CNPJ</th>
                <th className="p-4">Contato</th>
                <th className="p-4">Endereço</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-600">
              {tableLoading ? (
                <tr><td colSpan={5} className="p-8 text-center"><div className="flex justify-center gap-2 text-slate-500"><Loader2 className="animate-spin" /> Carregando...</div></td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum fornecedor encontrado.</td></tr>
              ) : (
                suppliers.map((sup) => (
                  <tr key={sup.id} className={`border-b border-slate-100 last:border-0 transition-colors ${editingId === sup.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                      <Building2 size={16} className="text-slate-400" /> 
                      {sup.name}
                    </td>
                    <td className="p-4">{sup.cnpj}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {sup.phone && <div className="flex items-center gap-1"><Phone size={14} className="text-slate-400" /> {sup.phone}</div>}
                        {sup.email && <div className="flex items-center gap-1"><Mail size={14} className="text-slate-400" /> {sup.email}</div>}
                      </div>
                    </td>
                    <td className="p-4">
                       {sup.address && <div className="flex items-center gap-1 max-w-[200px] truncate"><MapPin size={14} className="text-slate-400" /> {sup.address}</div>}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <TableAction variant="edit" onClick={() => handleEdit(sup)} />
                        <TableAction variant="delete" onClick={() => handleDelete(sup.id)} />
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
          <span className="text-sm text-slate-500">Total: <strong>{totalItems}</strong> fornecedores</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || tableLoading} className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"><ChevronLeft size={16} /></button>
            <span className="text-sm font-medium text-slate-700 px-2">Página {page} de {totalPages || 1}</span>
            <button onClick={() => setPage(p => (totalPages && p < totalPages ? p + 1 : p))} disabled={page >= totalPages || tableLoading} className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"><ChevronRight size={16} /></button>
          </div>
        </div>

      </div>
    </div>
  );
}
