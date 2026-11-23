import React, { useState, useEffect, useRef } from 'react';
import { Save, Search, Users, Loader2, Edit, Trash2, Plus, Mail, Phone, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- INTERFACE ---
interface Customer {
  id: string;
  name: string;
  document: string; // CPF ou CNPJ
  email: string;
  phoneNumber: string;
}

export function Customers() {
  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  
  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [documentDoc, setDocumentDoc] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // List States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;
  const [searchTerm, setSearchTerm] = useState('');

  // --- EFEITOS ---
  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // --- API: LISTAR ---
  const fetchCustomers = async (isReset = false) => {
    setListLoading(true);
    try {
      const params = {
        Page: isReset ? 1 : page,
        PageSize: pageSize,
        Search: isReset ? '' : searchTerm
      };
      
      const response = await api.get('/api/financial/customer/paged', { params });
      
      if (response.data.items) {
        setCustomers(response.data.items);
        setTotalItems(response.data.totalItems || 0);
      } else {
        setCustomers([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error("Erro ao buscar clientes", error);
    } finally {
      setListLoading(false);
    }
  };

  // --- API: SALVAR (POST/PUT) ---
  const handleSave = async () => {
    // VALIDAÇÃO: Apenas o nome é obrigatório agora
    if (!name.trim()) { alert("Informe o nome do cliente."); return; }
    
    // REMOVIDO: if (!documentDoc.trim()) { alert("Informe o CPF/CNPJ."); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('Name', name);
      formData.append('Document', documentDoc);
      formData.append('Email', email);
      formData.append('PhoneNumber', phone);

      if (editingId) {
        // PUT
        formData.append('Id', editingId);
        await api.put('/api/financial/customer', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Cliente atualizado com sucesso!");
        handleCancelEdit();
      } else {
        // POST
        await api.post('/api/financial/customer', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Cliente cadastrado com sucesso!");
        resetForm();
      }
      
      fetchCustomers();
    } catch (error) {
      console.error("Erro ao salvar", error);
      alert(getApiErrorMessage(error, 'Não foi possível salvar o cliente.'));
    } finally {
      setLoading(false);
    }
  };

  // --- API: DELETAR ---
  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este cliente?")) return;
    try {
        await api.delete(`/api/financial/customer/${id}`);
        fetchCustomers();
        if (editingId === id) handleCancelEdit();
    } catch (error) {
        alert(getApiErrorMessage(error, 'Não foi possível excluir o cliente.'));
    }
  };

  // --- HANDLERS UI ---
  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setName(customer.name);
    setDocumentDoc(customer.document || '');
    setEmail(customer.email || '');
    setPhone(customer.phoneNumber || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setName('');
    setDocumentDoc('');
    setEmail('');
    setPhone('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const handleSearch = () => { setPage(1); fetchCustomers(); };
  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-blue-600"/> Cadastro de Clientes
            </h1>
            <p className="text-slate-500">Gestão de clientes para lançamentos financeiros.</p>
        </div>
      </div>
      
      {/* FORMULÁRIO */}
      <div className={`bg-white rounded-xl shadow-sm border p-6 space-y-6 transition-all ${editingId ? 'border-orange-200 ring-1 ring-orange-100' : 'border-slate-200'}`}>
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                {editingId ? <Edit size={18} className="text-orange-500"/> : <Plus size={18} className="text-blue-500"/>}
                {editingId ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            {editingId && <button onClick={handleCancelEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">CANCELAR <X size={14}/></button>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome - Obrigatório */}
            <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Nome Completo *</label>
                <input 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    type="text" 
                    placeholder="Nome do cliente ou empresa"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
            </div>
            
            {/* CPF/CNPJ - Opcional */}
            <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <FileText size={14}/> CPF/CNPJ <span className="text-slate-400 font-normal text-xs">(Opcional)</span>
                </label>
                <input 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    type="text" 
                    placeholder="000.000.000-00"
                    value={documentDoc}
                    onChange={e => setDocumentDoc(e.target.value)}
                />
            </div>
            
            {/* Telefone - Opcional */}
            <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Phone size={14}/> Telefone <span className="text-slate-400 font-normal text-xs">(Opcional)</span>
                </label>
                <input 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    type="text" 
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                />
            </div>
            
            {/* Email - Opcional */}
            <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Mail size={14}/> Email <span className="text-slate-400 font-normal text-xs">(Opcional)</span>
                </label>
                <input 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    type="email" 
                    placeholder="cliente@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
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
            <h2 className="font-bold text-slate-700">Clientes Cadastrados</h2>
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2 text-slate-400" size={18}/>
                <input 
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500" 
                    placeholder="Buscar cliente..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                    <tr>
                        <th className="p-4">Cliente</th>
                        <th className="p-4">CPF/CNPJ</th>
                        <th className="p-4">Contato</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {listLoading ? (
                        <tr><td colSpan={4} className="p-8 text-center"><div className="flex justify-center gap-2"><Loader2 className="animate-spin"/> Carregando...</div></td></tr>
                    ) : customers.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-500 italic">Nenhum cliente encontrado.</td></tr>
                    ) : (
                        customers.map((cust) => (
                            <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-bold text-slate-800">{cust.name}</td>
                                <td className="p-4 text-slate-600 font-mono text-xs">{cust.document || '-'}</td>
                                <td className="p-4 text-slate-500">
                                    <div className="flex flex-col text-xs">
                                        {cust.phoneNumber ? <span className="flex items-center gap-1"><Phone size={10}/> {cust.phoneNumber}</span> : null}
                                        {cust.email ? <span className="flex items-center gap-1"><Mail size={10}/> {cust.email}</span> : null}
                                        {!cust.phoneNumber && !cust.email && <span>-</span>}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(cust)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16}/></button>
                                        <button onClick={() => handleDelete(cust.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
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
            <span className="text-sm text-slate-500">Total: <strong>{totalItems}</strong> clientes</span>
            <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || listLoading} className="p-2 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={16}/></button>
                <span className="text-sm px-2">Pág. {page} de {totalPages || 1}</span>
                <button onClick={() => setPage(p => (totalPages && p < totalPages ? p + 1 : p))} disabled={page >= totalPages || listLoading} className="p-2 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={16}/></button>
            </div>
         </div>
      </div>
    </div>
  );
}
