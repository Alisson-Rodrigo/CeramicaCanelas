import React, { useState, useEffect, useRef } from 'react';
import { FileText, Save, Loader2, DollarSign, Calendar, MessageSquare, CreditCard, Filter, X, User, Edit, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- ENUMS E HELPERS ---
const PaymentMethodDescriptions: Record<number, string> = {
  0: "Dinheiro", 1: "CXPJ", 2: "BBJ", 3: "BBJN", 4: "CHEQUE", 5: "BradescoPJ", 6: "CXJ", 7: "Débito Automático"
};

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Helper para evitar problema de timezone ao exibir
const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    // Pega apenas a parte da data YYYY-MM-DD
    const cleanDate = dateStr.split('T')[0]; 
    const [year, month, day] = cleanDate.split('-');
    return `${day}/${month}/${year}`;
};

// Helper para iniciar inputs com a data local correta (YYYY-MM-DD)
const getTodayLocal = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- INTERFACES ---
interface ExtractItem {
  id: string;
  paymentMethod: number;
  date: string;
  value: number;
  observations: string;
  operatorName: string;
}

export function RegisterStatement() {
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // --- ESTADOS DO FORMULÁRIO ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('0');
  
  // Data inicializada corretamente com local time
  const [date, setDate] = useState(getTodayLocal());
  
  const [value, setValue] = useState('');
  const [observations, setObservations] = useState('');

  // --- ESTADOS DA LISTA ---
  const [items, setItems] = useState<ExtractItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Filtros
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMethod, setFilterMethod] = useState('');

  // --- EFEITOS ---
  useEffect(() => {
    fetchExtracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // --- API: LISTAR ---
  const fetchExtracts = async (isReset = false) => {
    setListLoading(true);
    try {
        const params = {
            Page: isReset ? 1 : page,
            PageSize: pageSize,
            StartDate: (isReset ? '' : filterStartDate) || undefined,
            EndDate: (isReset ? '' : filterEndDate) || undefined,
            PaymentMethod: (isReset ? '' : filterMethod) ? Number(filterMethod) : undefined
        };

        const response = await api.get('/api/extracts/paged', { params });
        
        if (response.data.items) {
            setItems(response.data.items);
            setTotalItems(response.data.totalItems || 0);
        } else {
            setItems([]);
            setTotalItems(0);
        }
    } catch (error) {
        console.error("Erro ao buscar extratos", error);
    } finally {
        setListLoading(false);
    }
  };

  // --- HANDLERS: EDITAR / DELETAR ---
  const handleEdit = (item: ExtractItem) => {
    setEditingId(item.id);
    setPaymentMethod(item.paymentMethod.toString());
    
    // Extrai a data sem conversão de fuso
    setDate(item.date ? item.date.split('T')[0] : '');
    
    setValue(item.value.toString());
    setObservations(item.observations || '');
    
    if(formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setPaymentMethod('0');
    // Reseta para hoje
    setDate(getTodayLocal());
    setValue('');
    setObservations('');
  };

  // --- DELETE ---
  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este extrato permanentemente?")) return;
    try {
        const formData = new FormData();
        formData.append('Id', id);

        await api.delete('/api/extracts', { 
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        alert("Extrato excluído com sucesso!");
        if (editingId === id) handleCancelEdit();
        fetchExtracts();
    } catch (error) {
        console.error("Erro ao excluir", error);
        alert(getApiErrorMessage(error, 'Não foi possível excluir o extrato.'));
    }
  };

  // --- API: SALVAR (POST / PUT) ---
  const handleSave = async () => {
    if (!value || Number(value) === 0) {
      alert("Informe um valor válido.");
      return;
    }
    if (!date) {
      alert("Informe a data.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('PaymentMethod', paymentMethod);
      formData.append('Date', date);
      formData.append('Value', value.replace(',', '.'));
      formData.append('Observations', observations);

      if (editingId) {
        // PUT
        formData.append('Id', editingId);
        await api.put('/api/extracts', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Extrato atualizado com sucesso!");
        handleCancelEdit();
      } else {
        // POST
        await api.post('/api/extracts', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Extrato registrado com sucesso!");
        handleCancelEdit(); 
      }
      
      fetchExtracts();

    } catch (error) {
      console.error("Erro ao salvar extrato", error);
      alert(getApiErrorMessage(error, 'Não foi possível salvar o extrato.'));
    } finally {
      setLoading(false);
    }
  };

  // --- HELPERS UI ---
  const handleFilter = () => { setPage(1); fetchExtracts(); };
  const handleClearFilters = () => { setFilterStartDate(''); setFilterEndDate(''); setFilterMethod(''); setPage(1); fetchExtracts(true); };
  const totalPages = Math.ceil(totalItems / pageSize);
  const inputClass = "w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 bg-white transition-all text-sm";
  const labelClass = "text-xs font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1";

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex justify-between items-center" ref={formRef}>
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-blue-600"/> Cadastrar Extrato Manual
            </h1>
            <p className="text-slate-500">Registre e visualize lançamentos de extrato bancário.</p>
        </div>
      </div>
      
      {/* --- FORMULÁRIO DE CADASTRO / EDIÇÃO --- */}
      <div className={`bg-white rounded-xl shadow-sm border p-6 space-y-6 transition-all ${editingId ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-200'}`}>
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
                {editingId ? <Edit size={18} className="text-orange-500"/> : <Plus size={18} className="text-blue-500"/>}
                {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h2>
            {editingId && (
                <button onClick={handleCancelEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
                    CANCELAR <X size={14}/>
                </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={labelClass}><CreditCard size={14}/> Método / Banco</label>
                    <select className={inputClass} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                        {Object.entries(PaymentMethodDescriptions).map(([id, label]) => (
                            <option key={id} value={id}>{label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={labelClass}><Calendar size={14}/> Data do Extrato</label>
                    <input type="date" className={inputClass} value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                    <label className={labelClass}><DollarSign size={14}/> Valor (R$)</label>
                    <input type="number" step="0.01" className={`${inputClass} font-bold`} placeholder="0,00" value={value} onChange={e => setValue(e.target.value)} />
                    <p className="text-[10px] text-slate-400 mt-1">Use sinal negativo (-) para saídas.</p>
                </div>
                <div className="md:col-span-2">
                    <label className={labelClass}><MessageSquare size={14}/> Observações</label>
                    <textarea className={inputClass} rows={2} placeholder="Descrição..." value={observations} onChange={e => setObservations(e.target.value)}/>
                </div>
            </div>
            <div className="flex justify-end pt-2">
                <Button variant="primary" icon={loading ? Loader2 : Save} onClick={handleSave} disabled={loading} className="w-full md:w-auto">
                    {loading ? 'SALVANDO...' : (editingId ? 'ATUALIZAR' : 'REGISTRAR')}
                </Button>
            </div>
      </div>

      {/* --- LISTAGEM DE EXTRATOS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         {/* Filtros */}
         <div className="p-4 border-b border-slate-200 bg-slate-50">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                 <div>
                     <label className="text-[10px] font-bold text-slate-500 uppercase">De</label>
                     <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                 </div>
                 <div>
                     <label className="text-[10px] font-bold text-slate-500 uppercase">Até</label>
                     <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                 </div>
                 <div>
                     <label className="text-[10px] font-bold text-slate-500 uppercase">Método</label>
                     <select className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none bg-white" value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
                         <option value="">Todos</option>
                         {Object.entries(PaymentMethodDescriptions).map(([id, label]) => (
                             <option key={id} value={id}>{label}</option>
                         ))}
                     </select>
                 </div>
                 <div className="flex gap-2">
                    <Button variant="outline" size="sm" icon={X} onClick={handleClearFilters}>Limpar</Button>
                    <Button variant="soft" size="sm" icon={Filter} onClick={handleFilter}>Filtrar</Button>
                 </div>
             </div>
         </div>

         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                    <tr>
                        <th className="p-4 text-center">Data</th>
                        <th className="p-4">Banco / Método</th>
                        <th className="p-4">Observação</th>
                        <th className="p-4 text-right">Valor</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {listLoading ? (
                        <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin inline text-blue-500"/> Carregando...</td></tr>
                    ) : items.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Nenhum extrato encontrado.</td></tr>
                    ) : (
                        items.map((item) => (
                            <tr key={item.id} className={`transition-colors ${editingId === item.id ? 'bg-orange-50' : 'hover:bg-slate-50'}`}>
                                <td className="p-4 text-center font-mono text-slate-600">{formatDate(item.date)}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded"><CreditCard size={14}/></div>
                                        <span className="font-medium text-slate-700">{PaymentMethodDescriptions[item.paymentMethod] || 'Outros'}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="text-slate-800">{item.observations}</span>
                                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><User size={10}/> Registrado por: {item.operatorName}</span>
                                    </div>
                                </td>
                                <td className={`p-4 text-right font-bold ${item.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatMoney(item.value)}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => handleEdit(item)}
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
             </table>
         </div>

         {/* Paginação Laranja */}
         <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-500">Total: <strong>{totalItems}</strong></span>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1 || listLoading} 
                    className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                    <ChevronLeft size={16}/>
                </button>
                <span className="text-sm px-2 text-slate-700 font-medium">{page} de {totalPages || 1}</span>
                <button 
                    onClick={() => setPage(p => (totalPages && p < totalPages ? p + 1 : p))} 
                    disabled={page >= totalPages || listLoading} 
                    className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                    <ChevronRight size={16}/>
                </button>
            </div>
         </div>
      </div>

    </div>
  );
}
