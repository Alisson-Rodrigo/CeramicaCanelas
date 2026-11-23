import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { Save, Search, Filter, User, X, Users, Loader2, ChevronLeft, ChevronRight, Pencil, Trash2, Undo2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TableAction } from '@/components/ui/TableAction';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

interface Employee {
  id: string;
  name: string;
  cpf: string;
  positions: number; 
  imageUrl?: string;
  isActive: boolean;
}

const POSITIONS = [
  { value: 0, label: 'Enfornador' },
  { value: 1, label: 'Desenfornador' },
  { value: 2, label: 'Soldador' },
  { value: 3, label: 'Marombeiro' },
  { value: 4, label: 'Op. Pá Carregadeira' },
  { value: 5, label: 'Motorista' },
  { value: 6, label: 'Queimador' },
  { value: 7, label: 'Conferente' },
  { value: 8, label: 'Caixa' },
  { value: 9, label: 'Aux. Administrativo' },
  { value: 10, label: 'Aux. de Limpeza' },
  { value: 11, label: 'Dono' },
  { value: 12, label: 'Gerente' },
  { value: 13, label: 'Aux. de Estoque' },
  { value: 14, label: 'Prestador Serviço' },
  { value: 15, label: 'Pedreiro' },
];

export function EmployeeList() {
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Paginação
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Filtros (Estados)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [sortOption, setSortOption] = useState('name_asc');

  // Formulário
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    positions: 0 
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); 

  // --- BUSCA NA API ---
  // Adicionado parâmetro opcional 'overrideActiveOnly' para garantir atualização imediata do checkbox
 const fetchEmployees = async (isReset = false, overrideActiveOnly?: boolean) => {
    setTableLoading(true);
    try {
      const orderBy = 'Name';
      let ascending = true;
      const currentSort = isReset ? 'name_asc' : sortOption;

      if (currentSort === 'name_desc') ascending = false;

      let finalActiveOnly = activeOnly;
      if (overrideActiveOnly !== undefined) finalActiveOnly = overrideActiveOnly;
      if (isReset) finalActiveOnly = true;

      const params = {
        // --- CORREÇÃO PRINCIPAL AQUI ---
        // Antes estava "NameDescriptionPage", o que a API não entende.
        // Mudamos para "Page" (padrão)
        Page: isReset ? 1 : page, 
        
        PageSize: pageSize,
        Search: (isReset ? '' : searchTerm) || undefined,
        Positions: (isReset || filterPosition === '') ? undefined : Number(filterPosition),
        ActiveOnly: finalActiveOnly,
        OrderBy: orderBy,
        Ascending: ascending
      };

      const response = await api.get('/api/employees/pages', { params });
      const data = response.data;
      
      // --- CORREÇÃO DA CONTAGEM TOTAL ---
      // Garante que o totalItems seja lido corretamente para habilitar o botão
      if (data.items) {
        setEmployees(data.items);
        // Tenta ler totalItems OU totalCount (depende do seu backend)
        setTotalItems(data.totalItems ?? data.totalCount ?? 0);
      } else if (Array.isArray(data)) {
        setEmployees(data);
        setTotalItems(data.length);
      } else {
        setEmployees([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error("Erro ao buscar funcionários", error);
    } finally {
      setTableLoading(false);
    }
  };

  const handleFilter = () => { setPage(1); fetchEmployees(); };
  
  const handleClearFilters = () => {
    setSearchTerm(''); setFilterPosition(''); setActiveOnly(true); setSortOption('name_asc');
    setPage(1); fetchEmployees(true);
  };

  // Handler específico para o checkbox de ativos para disparar busca imediata
  const handleActiveToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = e.target.checked;
      setActiveOnly(isChecked);
      setPage(1); // Volta para página 1 ao mudar filtro
      fetchEmployees(false, isChecked); // Passa o valor novo diretamente para a função de busca
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFormData({
      name: emp.name,
      cpf: emp.cpf,
      positions: emp.positions 
    });
    setImagePreview(emp.imageUrl || null);
    setSelectedImage(null);
    if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', cpf: '', positions: 0 });
    setImagePreview(null);
    setSelectedImage(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este funcionário?")) return;
    try {
      await api.delete(`/api/employees/${id}`);
      alert("Funcionário excluído com sucesso!");
      if (editingId === id) handleCancelEdit();
      fetchEmployees();
    } catch (error) {
      console.error("Erro ao excluir", error);
      alert(getApiErrorMessage(error, 'Não foi possível excluir o funcionário.'));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.cpf) { alert("Nome e CPF são obrigatórios."); return; }
    setLoading(true);
    try {
      const data = new FormData();
      data.append('Name', formData.name);
      data.append('CPF', formData.cpf);
      data.append('Positiions', formData.positions.toString());
      if (selectedImage) data.append('Imagem', selectedImage);
      if (editingId) data.append('Id', editingId);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editingId) {
        await api.put('/api/employees', data, config);
        alert('Funcionário atualizado com sucesso!');
      } else {
        await api.post('/api/employees', data, config);
        alert('Funcionário cadastrado com sucesso!');
      }
      handleCancelEdit();
      fetchEmployees();
    } catch (error) {
      console.error("Erro ao salvar", error);
      alert(getApiErrorMessage(error, 'Não foi possível salvar o funcionário.'));
    } finally {
      setLoading(false);
    }
  };

  const getPositionLabel = (value: number) => {
    const pos = POSITIONS.find(p => p.value === value);
    return pos ? pos.label : 'Desconhecido';
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400";
  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Funcionários</h1>
          <p className="text-slate-500">Gerencie colaboradores.</p>
        </div>
      </div>

      {/* --- FORMULÁRIO --- */}
      <div ref={formRef} className={`rounded-xl shadow-sm border overflow-hidden transition-colors duration-300 ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${editingId ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
              {editingId ? <Pencil size={20} /> : <Users size={20} />}
            </div>
            <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
          </div>
          {editingId && (
            <button onClick={handleCancelEdit} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors">
              <X size={16} /> Cancelar Edição
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nome *</label>
              <input name="name" value={formData.name} onChange={handleInputChange} type="text" className={inputClass} placeholder="Nome completo" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">CPF *</label>
              <input name="cpf" value={formData.cpf} onChange={handleInputChange} type="text" className={inputClass} placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Cargo *</label>
              <select name="positions" value={formData.positions} onChange={handleInputChange} className={inputClass}>
                {POSITIONS.map(pos => (
                  <option key={pos.value} value={pos.value}>{pos.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Foto</label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer flex items-center justify-center px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <ImageIcon size={20} className="mr-2 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Escolher Foto</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
              {imagePreview && (
                <div className="relative w-16 h-16 border rounded-full overflow-hidden shadow-sm">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setImagePreview(null); setSelectedImage(null); }} className="absolute inset-0 bg-black/40 text-white opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"><X size={20} /></button>
                </div>
              )}
              <span className="text-sm text-slate-900 font-medium">{selectedImage ? selectedImage.name : 'Nenhuma foto'}</span>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
          {editingId && <Button variant="outline" icon={Undo2} onClick={handleCancelEdit}>CANCELAR</Button>}
          <Button variant="primary" icon={loading ? Loader2 : Save} onClick={handleSubmit} disabled={loading}>{loading ? 'SALVANDO...' : (editingId ? 'ATUALIZAR' : 'SALVAR FUNCIONÁRIO')}</Button>
        </div>
      </div>

      {/* --- ÁREA DE LISTAGEM E FILTROS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Lista de Colaboradores</h2>
          
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            
            {/* GRID DE FILTROS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              
              {/* Filtro: Busca */}
              <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buscar (Nome)</label>
                 <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                     type="text" 
                     className={inputClass} 
                     placeholder="Nome ou descrição..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                   />
                 </div>
              </div>

              {/* Filtro: Cargo (Positions) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo</label>
                <select className={inputClass} value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)}>
                  <option value="">Todos os Cargos</option>
                  {POSITIONS.map(pos => <option key={pos.value} value={pos.value}>{pos.label}</option>)}
                </select>
              </div>

              {/* Filtro: Ordenação */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ordenar por</label>
                <select className={inputClass} value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                  <option value="name_asc">Nome (A-Z)</option>
                  <option value="name_desc">Nome (Z-A)</option>
                </select>
              </div>
            </div>

            {/* BARRA INFERIOR DE FILTROS (Ativos e Botões) */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
               {/* Filtro: ActiveOnly (Agora com Trigger Imediato) */}
               <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 bg-white px-3 py-2 rounded border border-slate-200 shadow-sm hover:border-slate-300 transition-colors select-none">
                  <input 
                    type="checkbox" 
                    checked={activeOnly} 
                    onChange={handleActiveToggle}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  />
                  <span>Mostrar Apenas Ativos</span>
               </label>

               <div className="flex gap-2">
                 <Button variant="outline" icon={X} onClick={handleClearFilters}>LIMPAR</Button>
                 <Button variant="soft" icon={Filter} onClick={handleFilter}>FILTRAR</Button>
               </div>
            </div>
          </div>
        </div>

        {/* --- TABELA --- */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Foto</th>
                <th className="p-4">Nome</th>
                <th className="p-4">CPF</th>
                <th className="p-4">Cargo</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-600">
              {tableLoading ? (
                <tr><td colSpan={6} className="p-8 text-center"><div className="flex justify-center gap-2 text-slate-500"><Loader2 className="animate-spin" /> Carregando...</div></td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum funcionário encontrado.</td></tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className={`border-b border-slate-100 last:border-0 transition-colors ${editingId === emp.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <td className="p-4">
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border border-slate-300">
                        {emp.imageUrl ? <img src={emp.imageUrl} alt={emp.name} className="w-full h-full object-cover" /> : <User size={20} className="text-slate-500" />}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{emp.name}</td>
                    <td className="p-4 font-medium">{emp.cpf}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase">{getPositionLabel(emp.positions)}</span></td>
                    <td className="p-4 text-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${emp.isActive ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                            {emp.isActive ? 'ATIVO' : 'INATIVO'}
                        </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <TableAction variant="edit" onClick={() => handleEdit(emp)} />
                        <TableAction variant="delete" onClick={() => handleDelete(emp.id)} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé Paginação */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-sm text-slate-500">Total: <strong>{totalItems}</strong> funcionários</span>
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
