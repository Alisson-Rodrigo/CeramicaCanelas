import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Search, Banknote, ArrowUpCircle, ArrowDownCircle, 
  Loader2, Paperclip, User, Tag, X, Check, FileText, 
  Filter, AlertCircle, ChevronLeft, ChevronRight, Edit, Trash2, 
  Image as ImageIcon, History, Clock, CheckCircle2, Eye, Calendar,
  UserCircle // Importei um ícone específico para o operador
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TableAction } from '@/components/ui/TableAction';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- ENUMS ---
enum LaunchType {
  Income = 1,
  Expense = 2
}

enum PaymentStatus {
  Pending = 0,
  Paid = 1
}

const PaymentStatusDescriptions: Record<number, string> = {
    0: "Pendente",
    1: "Pago"
};

const PaymentMethodDescriptions: Record<number, string> = {
  0: "Dinheiro", 1: "CXPJ", 2: "BBJ", 3: "BBJN", 4: "CHEQUE", 5: "BradescoPJ", 6: "CXJ", 7: "Débito Automático"
};

// --- INTERFACES ---
interface CategoryItem { id: string; name: string; }
interface CustomerItem { id: string; name: string; }

interface Launch {
  id: string;
  description: string;
  amount: number;
  type: number;
  launchDate: string;
  dueDate?: string;
  status: number;
  categoryId?: string;
  categoryName?: string;
  customerId?: string;
  customerName?: string;
  operatorName?: string; // Campo do operador
  paymentMethod: number;
  imageProofsUrls: string[];
}

interface HistoryItem {
  id: string;
  description: string;
  amount: number;
  type: number;
  categoryName: string;
  customerName: string;
  paymentMethod: string;
  createdOn: string;
  changeType: string;
}

// --- HELPERS DE DATA E FORMATAÇÃO ---

const getTodayLocal = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const cleanDate = dateStr.split('T')[0]; 
    const [year, month, day] = cleanDate.split('-');
    return `${day}/${month}/${year}`;
};

const formatTime = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const getSafeImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    const baseUrl = api.defaults.baseURL || ''; 
    return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
};

// --- COMPONENTE DE MODAL DE BUSCA ---
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
      const params = { Page: page, PageSize: pageSize, Search: term };
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
    if (e.key === 'Enter') { setPage(1); loadData(); } 
  };

  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = page < totalPages;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
        </div>
        <div className="p-4 border-b border-slate-100">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input autoFocus type="text" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKey} />
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50 min-h-[250px]">
            {loading ? (
                <div className="flex flex-col items-center justify-center p-8 text-blue-600 gap-2 h-full"><Loader2 className="animate-spin" /><span className="text-xs font-medium">Carregando...</span></div>
            ) : items.length === 0 ? (
                <div className="text-center p-8 text-slate-400 h-full flex items-center justify-center">Nada encontrado.</div>
            ) : (
                items.map((item, idx) => (
                <div key={idx} onClick={() => { onSelect(item); onClose(); }} className="bg-white p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all flex items-center justify-between group">
                    <div className="flex-1">{renderItem(item)}</div>
                    <div className="opacity-0 group-hover:opacity-100 text-blue-600"><CheckCircle2 size={18}/></div>
                </div>
            )))}
        </div>
        <div className="p-3 border-t border-slate-100 flex justify-between items-center text-sm bg-white">
            <button disabled={page === 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"><ChevronLeft size={20} strokeWidth={2.5}/></button>
            <span className="text-slate-500 font-medium bg-slate-50 px-3 py-1 rounded-full text-xs border border-slate-100">{totalItems > 0 ? `Página ${page} de ${totalPages}` : '-'}</span>
            <button disabled={!hasNextPage || loading} onClick={() => setPage(p => p + 1)} className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"><ChevronRight size={20} strokeWidth={2.5}/></button>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export function Transactions() {
  const [listLoading, setListLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const formTopRef = useRef<HTMLDivElement>(null);

  // --- ESTADOS ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<number>(LaunchType.Expense);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [launchDate, setLaunchDate] = useState(getTodayLocal());
  const [dueDate, setDueDate] = useState(getTodayLocal());
  const [formStatus, setFormStatus] = useState(PaymentStatus.Pending.toString());
  const [formPaymentMethod, setFormPaymentMethod] = useState('0');
  
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  
  const [files, setFiles] = useState<FileList | null>(null);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]); 
  const [proofsToDelete, setProofsToDelete] = useState<string[]>([]); 

  const [launches, setLaunches] = useState<Launch[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  const [search, setSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [histStartDate, setHistStartDate] = useState(getTodayLocal()); 
  const [histEndDate, setHistEndDate] = useState(getTodayLocal());     
  const [histType, setHistType] = useState(''); 

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  useEffect(() => {
    fetchLaunches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    fetchLaunchHistory(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLaunches = async (isReset = false) => {
    setListLoading(true);
    try {
        const params = {
            Page: isReset ? 1 : page,
            PageSize: pageSize,
            Search: (isReset ? '' : search) || undefined,
            StartDate: (isReset ? '' : filterStartDate) || undefined,
            EndDate: (isReset ? '' : filterEndDate) || undefined,
            Status: (isReset ? '' : filterStatus) || undefined,
            Type: (isReset ? '' : filterType) || undefined,
        };
        const response = await api.get('/api/financial/launch/paged', { params });
        if (response.data.items) {
            setLaunches(response.data.items);
            setTotalItems(response.data.totalItems ?? response.data.totalCount ?? 0);
        } else {
            setLaunches([]);
            setTotalItems(0);
        }
    } catch (error) { console.error(error); } finally { setListLoading(false); }
  };

  const fetchLaunchHistory = async () => {
    setHistoryLoading(true);
    try {
        const params = { StartDate: histStartDate || undefined, EndDate: histEndDate || undefined, Type: histType ? Number(histType) : undefined, Page: 1, PageSize: 50 };
        const response = await api.get('/api/financial/launch/history', { params });
        if (response.data.items) setHistoryItems(response.data.items); else setHistoryItems([]);
    } catch (error) { console.error("Erro histórico", error); } finally { setHistoryLoading(false); }
  };

  const handleHistFilter = () => fetchLaunchHistory();
  const handleHistClear = () => {
      const today = getTodayLocal();
      setHistStartDate(today); setHistEndDate(today); setHistType('');
      setTimeout(() => fetchLaunchHistory(), 50); 
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir permanentemente este lançamento?")) return;
    try {
        await api.delete(`/api/financial/launch/${id}`);
        alert("Lançamento excluído!");
        if (editingId === id) handleCancelEdit();
        fetchLaunches(); fetchLaunchHistory(); 
    } catch (error) { alert(getApiErrorMessage(error, 'Não foi possível excluir o lançamento.')); }
  };

  const handleEdit = (item: Launch) => {
    setEditingId(item.id);
    setFormType(item.type);
    setDescription(item.description);
    setAmount(item.amount.toString());
    setLaunchDate(item.launchDate ? item.launchDate.split('T')[0] : '');
    setDueDate(item.dueDate ? item.dueDate.split('T')[0] : '');
    setFormStatus(item.status.toString());
    setFormPaymentMethod(item.paymentMethod.toString());

    if (item.categoryId && item.categoryName) setSelectedCategory({ id: item.categoryId, name: item.categoryName });
    else setSelectedCategory(null);

    if (item.customerId && item.customerName) setSelectedCustomer({ id: item.customerId, name: item.customerName });
    else setSelectedCustomer(null);

    setExistingImages(item.imageProofsUrls || []);
    setProofsToDelete([]);
    setFiles(null);
    setFilePreviews([]);

    if (formTopRef.current) formTopRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDescription(''); setAmount(''); setSelectedCategory(null); setSelectedCustomer(null); 
    setFiles(null); setFilePreviews([]); setExistingImages([]); setProofsToDelete([]);
    setFormType(LaunchType.Expense);
    setLaunchDate(getTodayLocal()); setDueDate(getTodayLocal());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setFiles(e.target.files);
        const newPreviews = Array.from(e.target.files).map(file => URL.createObjectURL(file));
        setFilePreviews(newPreviews);
    }
  };

  const handleMarkImageForDeletion = (url: string) => {
    setProofsToDelete([...proofsToDelete, url]);
    setExistingImages(existingImages.filter(img => img !== url));
  };

  const handleSave = async () => {
    if (!description || !amount) { alert("Preencha Descrição e Valor."); return; }
    if (formType === LaunchType.Expense && !selectedCategory) { alert("Selecione a Categoria."); return; }
    
    setLoading(true);
    try {
        const formData = new FormData();
        formData.append('Description', description);
        formData.append('Amount', amount.replace(',', '.'));
        formData.append('LaunchDate', launchDate);
        
        // --- ALTERAÇÃO AQUI: Só envia DueDate se NÃO for Pago ---
        if (Number(formStatus) !== PaymentStatus.Paid) {
            formData.append('DueDate', dueDate);
        }
        // ---------------------------------------------------------

        formData.append('Type', formType.toString());
        formData.append('PaymentMethod', formPaymentMethod);
        formData.append('Status', formStatus);

        if (formType === LaunchType.Expense && selectedCategory) formData.append('CategoryId', selectedCategory.id);
        if (formType === LaunchType.Income && selectedCustomer) formData.append('CustomerId', selectedCustomer.id);

        if (files) {
            for (let i = 0; i < files.length; i++) {
                formData.append('ImageProofs', files[i]);
            }
        }

        if (editingId) {
            formData.append('Id', editingId);
            proofsToDelete.forEach(url => formData.append('ProofsToDelete', url));
            await api.put('/api/financial/launch', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            alert("Lançamento atualizado!");
        } else {
            await api.post('/api/financial/launch', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            alert("Lançamento salvo!");
        }
        
        handleCancelEdit();
        fetchLaunches(); 
        fetchLaunchHistory(); 

    } catch (error) {
        console.error("Erro save", error);
        alert(getApiErrorMessage(error, 'Não foi possível salvar o lançamento.'));
    } finally {
        setLoading(false);
    }
  };

  const handleFilter = () => { setPage(1); fetchLaunches(); };
  const handleClearFilters = () => { setSearch(''); setFilterStartDate(''); setFilterEndDate(''); setFilterStatus(''); setFilterType(''); setPage(1); fetchLaunches(true); };
  const totalPages = Math.ceil(totalItems / pageSize);
  const inputClass = "w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-slate-700";

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex justify-between items-center" ref={formTopRef}>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Banknote className="text-blue-600"/> Lançamentos Financeiros
        </h1>
      </div>
      
      {/* --- FORMULÁRIO --- */}
      <div className={`bg-white rounded-xl shadow-sm border p-6 space-y-6 transition-all ${editingId ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-200'}`}>
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
                {editingId ? <Edit className="text-orange-500" size={20}/> : <Banknote className="text-blue-500" size={20}/>}
                {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h2>
            {editingId && <Button variant="outline" size="sm" icon={X} onClick={handleCancelEdit}>Cancelar Edição</Button>}
        </div>
        
        <div className="flex gap-4 border-b border-slate-100 pb-6">
            <button onClick={() => { setFormType(LaunchType.Income); setSelectedCategory(null); }} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 border-2 transition-all ${formType === LaunchType.Income ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-100 text-slate-400 hover:border-emerald-200'}`}><ArrowUpCircle size={20}/> ENTRADA</button>
            <button onClick={() => { setFormType(LaunchType.Expense); setSelectedCustomer(null); }} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 border-2 transition-all ${formType === LaunchType.Expense ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' : 'border-slate-100 text-slate-400 hover:border-red-200'}`}><ArrowDownCircle size={20}/> SAÍDA</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-3"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descrição</label><input type="text" className={inputClass} value={description} onChange={e => setDescription(e.target.value)} /></div>
            <div className="md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Valor (R$)</label><input type="number" className={`${inputClass} font-bold text-lg ${formType === LaunchType.Income ? 'text-emerald-600' : 'text-red-600'}`} placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} /></div>
            
            {formType === LaunchType.Expense && (
                <div className="md:col-span-4 animate-fade-in">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Categoria da Despesa</label>
                    <div onClick={() => setIsCategoryModalOpen(true)} className="cursor-pointer relative group">
                        <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 flex items-center justify-between group-hover:border-blue-400 transition-colors">
                            <span className={selectedCategory ? "text-slate-800 font-medium" : "text-slate-400 italic"}>{selectedCategory ? selectedCategory.name : "Selecione a categoria..."}</span>
                            <Tag className="text-slate-400" size={18}/>
                        </div>
                    </div>
                </div>
            )}
            {formType === LaunchType.Income && (
                <div className="md:col-span-4 animate-fade-in">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        Cliente (Pagador) <span className="font-normal text-slate-400 text-[10px] ml-1">(Opcional)</span>
                    </label>
                    <div onClick={() => setIsCustomerModalOpen(true)} className="cursor-pointer relative group">
                        <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 flex items-center justify-between group-hover:border-blue-400 transition-colors">
                            <span className={selectedCustomer ? "text-slate-800 font-medium" : "text-slate-400 italic"}>{selectedCustomer ? selectedCustomer.name : "Selecione o cliente..."}</span>
                            <User className="text-slate-400" size={18}/>
                        </div>
                    </div>
                </div>
            )}

            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data Lançamento</label><input type="date" className={inputClass} value={launchDate} onChange={e => setLaunchDate(e.target.value)} /></div>
            
            {/* O campo Data Vencimento ainda aparece, mas se o status for PAGO, o back-end não receberá esse valor (devido à lógica no handleSave) */}
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data Vencimento</label><input type="date" className={inputClass} value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={formStatus === PaymentStatus.Paid.toString()} title={formStatus === PaymentStatus.Paid.toString() ? "Não é necessário para status Pago" : ""} /></div>
            
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Pagamento</label><select className={inputClass} value={formPaymentMethod} onChange={e => setFormPaymentMethod(e.target.value)}>{Object.entries(PaymentMethodDescriptions).map(([id, label]) => (<option key={id} value={id}>{label}</option>))}</select></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status</label><select className={inputClass} value={formStatus} onChange={e => setFormStatus(e.target.value)}><option value={PaymentStatus.Pending}>Pendente</option><option value={PaymentStatus.Paid}>Pago</option></select></div>

            <div className="md:col-span-4">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Comprovantes</label>
                {existingImages.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                        {existingImages.map((url, idx) => (
                            <div key={idx} className="relative group border border-slate-200 rounded-lg overflow-hidden w-24 h-24 bg-slate-100">
                                <img src={getSafeImageUrl(url)} alt="Comprovante" className="w-full h-full object-cover"/>
                                <button onClick={() => handleMarkImageForDeletion(url)} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                                <a href={getSafeImageUrl(url)} target="_blank" rel="noreferrer" className="absolute bottom-0 left-0 bg-black/50 text-white p-1 rounded-tr-lg opacity-0 group-hover:opacity-100"><Eye size={14}/></a>
                            </div>
                        ))}
                    </div>
                )}
                {filePreviews.length > 0 && (
                    <div className="mb-3">
                        <p className="text-[10px] uppercase font-bold text-blue-600 mb-2">Novos Arquivos Selecionados:</p>
                        <div className="flex flex-wrap gap-2">
                            {filePreviews.map((url, idx) => (
                                <div key={`new-${idx}`} className="relative border border-blue-200 rounded-lg overflow-hidden w-20 h-20 bg-blue-50">
                                    <img src={url} alt="Preview" className="w-full h-full object-cover"/>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 transition-all relative cursor-pointer group">
                    <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                    <Paperclip className="mb-1 text-blue-400 group-hover:scale-110 transition-transform"/><span className="text-xs font-medium">{files && files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : 'Clique para Anexar Novos Arquivos'}</span>
                </div>
            </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button variant="primary" icon={loading ? Loader2 : Save} onClick={handleSave} disabled={loading} className="w-full md:w-auto">
                {loading ? 'SALVANDO...' : (editingId ? 'ATUALIZAR LANÇAMENTO' : 'SALVAR LANÇAMENTO')}
            </Button>
        </div>
      </div>
      
      {/* --- LISTAGEM PRINCIPAL --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-700 mb-4">Listagem Geral</h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
                <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Buscar</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm outline-none" placeholder="Descrição..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label><select className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={filterType} onChange={e => setFilterType(e.target.value)}><option value="">Todos</option><option value="1">Entrada</option><option value="2">Saída</option></select></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Status</label><select className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="">Todos</option><option value="0">Pendente</option><option value="1">Pago</option></select></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">De</label><input type="date" className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Até</label><input type="date" className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} /></div>
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" icon={X} onClick={handleClearFilters}>Limpar</Button>
                <Button variant="soft" size="sm" icon={Filter} onClick={handleFilter}>Filtrar</Button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-500">
                    <tr>
                        <th className="p-4 text-center">Tipo</th>
                        <th className="p-4">Descrição</th>
                        <th className="p-4">Categoria / Pagamento</th>
                        <th className="p-4">Datas</th>
                        {/* ALTERAÇÃO: Coluna Operador */}
                        <th className="p-4">Operador</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right">Valor</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {listLoading ? (
                        <tr><td colSpan={8} className="p-8 text-center"><Loader2 className="animate-spin inline text-blue-500"/></td></tr>
                    ) : launches.length === 0 ? (
                        <tr><td colSpan={8} className="p-8 text-center text-slate-400 italic">Nenhum lançamento encontrado.</td></tr>
                    ) : (
                        launches.map(item => (
                            <tr key={item.id} className={`transition-colors ${editingId === item.id ? 'bg-orange-50' : 'hover:bg-slate-50'}`}>
                                <td className="p-4 text-center">
                                    {item.type === LaunchType.Income ? (<span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold border border-emerald-200"><ArrowUpCircle size={12} /> Entrada</span>) : (<span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold border border-red-200"><ArrowDownCircle size={12} /> Saída</span>)}
                                </td>
                                <td className="p-4">
                                    <div className="font-bold text-slate-800 flex items-center gap-2">{item.description} {item.imageProofsUrls && item.imageProofsUrls.length > 0 && <Paperclip size={14} className="text-blue-500" />}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex flex-col">
                                        {item.type === LaunchType.Income && item.customerName && <span className="flex items-center gap-1 text-emerald-600"><User size={10}/> {item.customerName}</span>}
                                        {item.type === LaunchType.Expense && item.categoryName && <span className="flex items-center gap-1 text-red-600"><Tag size={10}/> {item.categoryName}</span>}
                                    </div>
                                </td>
                                <td className="p-4"><div className="flex flex-col gap-1"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs w-fit text-slate-600 border border-slate-200">{item.categoryName || '-'}</span><span className="text-xs text-slate-400">{PaymentMethodDescriptions[item.paymentMethod]}</span></div></td>
                                <td className="p-4 text-xs"><div className="flex flex-col gap-1"><span className="text-slate-600">Lanç: {formatDate(item.launchDate)}</span>{item.dueDate && <span className="text-orange-600 font-medium">Venc: {formatDate(item.dueDate)}</span>}</div></td>
                                
                                {/* ALTERAÇÃO: Exibição do Operador */}
                                <td className="p-4">
                                    <div className="flex items-center gap-1 text-slate-600">
                                        <UserCircle size={16} className="text-slate-400"/>
                                        <span className="text-xs font-medium">{item.operatorName || '-'}</span>
                                    </div>
                                </td>

                                <td className="p-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold border ${item.status === PaymentStatus.Paid ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>{PaymentStatusDescriptions[item.status]}</span></td>
                                <td className={`p-4 text-right font-bold text-base ${item.type === LaunchType.Income ? 'text-emerald-600' : 'text-red-600'}`}>{item.type === LaunchType.Expense ? '-' : '+'} {formatMoney(item.amount)}</td>
                                <td className="p-4 text-right"><div className="flex justify-end gap-2"><TableAction variant="edit" onClick={() => handleEdit(item)} /><TableAction variant="delete" onClick={() => handleDelete(item.id)} /></div></td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
         </div>
         
         <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-500">Total: <strong>{totalItems}</strong></span>
            <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || listLoading} className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"><ChevronLeft size={16}/></button>
                <span className="text-sm px-2 text-slate-600 font-medium">{page} de {totalPages || 1}</span>
                <button onClick={() => setPage(p => (totalPages && p < totalPages ? p + 1 : p))} disabled={page >= totalPages || listLoading} className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"><ChevronRight size={16}/></button>
            </div>
         </div>
      </div>

      {/* --- TABELA 2: HISTÓRICO DE LANÇAMENTOS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8 animate-fade-in">
         <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 justify-between items-end">
             <div className="flex-1 w-full">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <History className="text-purple-600"/> Histórico de Lançamentos
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                     <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">De</label><input type="date" className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs outline-none" value={histStartDate} onChange={e => setHistStartDate(e.target.value)} /></div>
                     <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Até</label><input type="date" className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs outline-none" value={histEndDate} onChange={e => setHistEndDate(e.target.value)} /></div>
                     <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo</label><select className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white" value={histType} onChange={e => setHistType(e.target.value)}><option value="">Todos</option><option value="1">Receita</option><option value="2">Despesa</option></select></div>
                     <div className="flex gap-2 items-end"><Button variant="soft" size="sm" icon={Filter} onClick={handleHistFilter}>Filtrar</Button><Button variant="outline" size="sm" icon={X} onClick={handleHistClear}>Limpar</Button></div>
                 </div>
             </div>
         </div>
         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-purple-50 text-purple-900 font-bold uppercase text-xs">
                    <tr><th className="p-4 text-center">Hora</th><th className="p-4 text-center">Tipo</th><th className="p-4">Descrição</th><th className="p-4">Categoria / Cliente</th><th className="p-4">Método</th><th className="p-4 text-center">Ação</th><th className="p-4 text-right">Valor</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {historyLoading ? (<tr><td colSpan={7} className="p-8 text-center"><Loader2 className="animate-spin inline text-purple-500"/> Carregando histórico...</td></tr>) : historyItems.length === 0 ? (<tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">Nenhum registro encontrado no período.</td></tr>) : (
                        historyItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 text-center text-xs font-mono text-slate-500"><div className="flex items-center justify-center gap-1"><Clock size={12}/> {formatTime(item.createdOn)}</div></td>
                                <td className="p-4 text-center">{item.type === 1 ? (<span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-bold"><ArrowUpCircle size={10} /> Rec</span>) : (<span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-[10px] font-bold"><ArrowDownCircle size={10} /> Desp</span>)}</td>
                                <td className="p-4 font-medium text-slate-800 text-xs">{item.description}</td>
                                <td className="p-4 text-xs text-slate-500"><div className="flex flex-col"><span className="font-bold text-slate-700">{item.categoryName || 'S/ Categoria'}</span><span className="text-slate-400">{item.customerName || 'S/ Cliente'}</span></div></td>
                                <td className="p-4 text-xs text-slate-600 font-medium">{item.paymentMethod}</td>
                                <td className="p-4 text-center"><span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{item.changeType}</span></td>
                                <td className={`p-4 text-right font-bold text-sm ${item.type === 1 ? 'text-emerald-600' : 'text-red-600'}`}>{formatMoney(item.amount)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
             </table>
         </div>
      </div>

      <SearchModal<CategoryItem> isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Buscar Categoria" fetchData={(params) => api.get('/api/financial/launch-categories/paged', { params })} onSelect={setSelectedCategory} renderItem={(cat) => (<div className="font-bold text-slate-800">{cat.name}</div>)} />
      <SearchModal<CustomerItem> isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title="Buscar Cliente" fetchData={(params) => api.get('/api/financial/customer/paged', { params })} onSelect={setSelectedCustomer} renderItem={(cus) => (<div className="font-bold text-slate-800">{cus.name}</div>)} />

    </div>
  );
}
