import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Search, User, Package, Plus, Trash2, ShoppingCart, 
  Printer, Filter, PlusCircle, MinusCircle, Loader2, X, ChevronLeft, ChevronRight, Pencil, Undo2, FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TableAction } from '@/components/ui/TableAction';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- HELPERS DE DATA ---
// Garante data local YYYY-MM-DD
const getTodayLocal = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Formata para exibição sem alterar fuso
const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const cleanDate = dateStr.split('T')[0]; 
    const [year, month, day] = cleanDate.split('-');
    return `${day}/${month}/${year}`;
};

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// --- 1. ENUMS E MAPEAMENTOS ---

const ProductType = {
  Brick1_6: 0, Brick2_6: 1, Brick1_8: 2, Brick2_8: 3, Brick8G: 4, Brick6Double: 5,
  Block9: 6, Block9Double: 7, Bands6: 8, Bands8: 9, Bands9: 10,
  RoofTile1: 11, RoofTile2: 12, Slabs: 13, GrillBricks: 14,
  Caldeado6: 15, Caldeado8: 16, Caldeado9: 17
};

const ProductDescriptions: Record<number, string> = {
  0: "Tijolos de 1ª 06 Furos", 1: "Tijolos de 2ª 06 Furos", 2: "Tijolos de 1ª 08 Furos",
  3: "Tijolos de 2ª 08 Furos", 4: "Tijolos de 08 Furos G", 5: "Tijolo de 6 furos Duplo",
  6: "Blocos de 9 Furos", 7: "Blocos de 9 Furos Duplo", 8: "Bandas 6 furos",
  9: "Bandas 8 furos", 10: "Bandas 9 furos", 11: "Telhas de 1ª",
  12: "Telhas de 2ª", 13: "Lajotas", 14: "Tijolos para churrasqueira",
  15: "Caldeado 6 furos", 16: "Caldeado 8 furos", 17: "Caldeado 9 furos"
};

enum SaleStatusEnum {
  Pending = 0,
  PartiallyPaid = 1,
  Confirmed = 2,
  Cancelled = 3,
  Donation = 4
}

const SaleStatusDescriptions: Record<number, string> = {
    0: "Pendente",
    1: "Pago Parcialmente",
    2: "Confirmado",
    3: "Cancelado",
    4: "Doação"
};

enum PaymentMethod {
  Dinheiro = 0, CXPJ = 1, BBJ = 2, BBJN = 3, CHEQUE = 4, BradescoPJ = 5, CXJ = 6, DebitoAutomatico = 7 
}

const PaymentMethodDescriptions: Record<number, string> = {
  0: "Dinheiro", 1: "CXPJ", 2: "BBJ", 3: "BBJN", 4: "CHEQUE", 5: "BradescoPJ", 6: "CXJ", 7: "Débito Automático"
}

const PRODUCT_CATALOG = Object.entries(ProductDescriptions).map(([id, name]) => ({
  id: Number(id), name: name, defaultPrice: id === '11' || id === '12' ? 1200 : 800 
}));

// --- INTERFACES ---
interface CartItem {
  itemId?: string; 
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  break: number; 
  subtotal: number;
}

interface SaleItemDetail {
    id: string;
    product: string; 
    unitPrice: number;
    quantity: number;
    subtotal: number;
    break: number;
}

interface SalePayment {
    id?: string;
    paymentMethod: number;
    amount: number;
    date: string;
}

interface Sale {
    id: string;
    noteNumber: number;
    saleDate: string;
    city: string;
    state: string;
    customerName: string;
    customerAddress?: string; 
    customerPhone: string;
    status: number; 
    totalNet: number;
    discount: number;
    remainingBalance: number;
    itemsCount: number;
    items: SaleItemDetail[];
    payments: SalePayment[];
}

export function NewSale() {
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);
  const formTopRef = useRef<HTMLDivElement>(null);
  
  // --- ESTADOS ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [city, setCity] = useState(''); 
  const [state, setState] = useState(''); 

  // DATA INICIAL CORRIGIDA
  const [saleDate, setSaleDate] = useState(getTodayLocal()); 
  
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>(PaymentMethod.Dinheiro.toString()); 
  const [currentPaymentId, setCurrentPaymentId] = useState<string | undefined>(undefined); 
  
  const [saleStatus, setSaleStatus] = useState<string>(SaleStatusEnum.Pending.toString());
  const [amountPaid, setAmountPaid] = useState<number>(0);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(''); 
  const [itemQuantity, setItemQuantity] = useState<number | string>(1);
  
  const [itemPrice, setItemPrice] = useState(''); 
  const [itemBreak, setItemBreak] = useState(''); 

  // Listagem
  const [sales, setSales] = useState<Sale[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;
  
  // Filtros
  const [searchFilter, setSearchFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // --- CÁLCULOS TOTAIS ---
  const subtotalCarrinho = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalCarrinho = subtotalCarrinho - discount;
  const remainingBalance = totalCarrinho - amountPaid;

  // --- EFEITOS ---
  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const status = Number(saleStatus);
    if (status === SaleStatusEnum.Confirmed) {
        setAmountPaid(totalCarrinho > 0 ? totalCarrinho : 0);
    } else if (status === SaleStatusEnum.Pending) {
        setAmountPaid(0);
    }
  }, [saleStatus, totalCarrinho]);

  const fetchSales = async (isReset = false) => {
    setTableLoading(true);
    try {
        const params = {
            Page: isReset ? 1 : page,
            PageSize: pageSize,
            Search: (isReset ? '' : searchFilter) || undefined,
            StartDate: (isReset ? '' : startDateFilter) || undefined,
            EndDate: (isReset ? '' : endDateFilter) || undefined,
            Status: (isReset || statusFilter === '') ? undefined : Number(statusFilter),
            PaymentMethod: (isReset || paymentMethodFilter === '') ? undefined : Number(paymentMethodFilter)
        };
        const response = await api.get('/api/sales/paged', { params });
        const data = response.data;
        if (data.items) { setSales(data.items); setTotalItems(data.totalItems || 0); } 
        else { setSales([]); setTotalItems(0); }
    } catch (error) { console.error("Erro sales", error); } 
    finally { setTableLoading(false); }
  };

  const handleGeneratePdfReport = async () => {
    setPdfLoading(true);
    try {
        const params = {
            StartDate: startDateFilter || undefined,
            EndDate: endDateFilter || undefined,
            Status: statusFilter !== '' ? Number(statusFilter) : undefined,
            PaymentMethod: paymentMethodFilter !== '' ? Number(paymentMethodFilter) : undefined,
        };
        const response = await api.get('/api/sales/items/pdf', { params, responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        const href = url;
        link.href = href;
        link.setAttribute('download', `relatorio_geral_${getTodayLocal()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) { console.error("Erro PDF Geral", error); alert(getApiErrorMessage(error, 'Não foi possível gerar o relatório.')); }
    finally { setPdfLoading(false); }
  };

  const handlePrintReceipt = async (id: string, noteNumber: number) => {
    setReceiptLoadingId(id);
    try {
        const response = await api.get(`/api/sales/${id}/receipt`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `recibo_venda_${noteNumber}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error("Erro ao baixar recibo", error);
        alert(getApiErrorMessage(error, 'Não foi possível gerar o recibo da venda.'));
    } finally {
        setReceiptLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente esta venda?")) return;
    try {
        await api.delete(`/api/sales/${id}`);
        alert("Venda excluída com sucesso!");
        if (editingId === id) handleCancelEdit();
        fetchSales();
    } catch (error) { console.error("Erro delete", error); alert(getApiErrorMessage(error, 'Não foi possível excluir a venda.')); }
  };

  // --- HANDLERS (CRUD) ---
  const handleEdit = (sale: Sale) => {
    setEditingId(sale.id);
    setCustomerName(sale.customerName);
    setCustomerAddress(sale.customerAddress || '');
    setCustomerPhone(sale.customerPhone || '');
    
    setCity(sale.city || '');
    setState(sale.state || '');
    
    // CORREÇÃO DATA EDIÇÃO
    setSaleDate(sale.saleDate ? sale.saleDate.split('T')[0] : getTodayLocal());
    
    setDiscount(sale.discount || 0);
    setSaleStatus(sale.status.toString());

    if (sale.payments && sale.payments.length > 0) {
        setPaymentMethod(sale.payments[0].paymentMethod.toString());
        setCurrentPaymentId(sale.payments[0].id);
        setAmountPaid(sale.payments[0].amount); 
    } else {
        setPaymentMethod('0');
        setCurrentPaymentId(undefined);
        setAmountPaid(0);
    }

    const cartItems: CartItem[] = sale.items.map(item => {
        const prodIdInt = ProductType[item.product as keyof typeof ProductType];
        return {
            itemId: item.id,
            productId: prodIdInt !== undefined ? prodIdInt : 0,
            productName: ProductDescriptions[prodIdInt] || item.product,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            break: item.break,
            subtotal: item.subtotal
        };
    });
    setCart(cartItems);
    if (formTopRef.current) formTopRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCustomerName(''); setCustomerAddress(''); setCustomerPhone(''); setCart([]); setDiscount(0);
    setCity(''); setState('');
    setCurrentPaymentId(undefined); setPaymentMethod('0'); setSaleStatus('0'); setAmountPaid(0);
    setSaleDate(getTodayLocal()); // Reset para hoje
  };

  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prodId = e.target.value;
    setSelectedProductId(prodId);
    const prod = PRODUCT_CATALOG.find(p => p.id === Number(prodId));
    if (prod) {
        setItemPrice(prod.defaultPrice.toString());
    } else {
        setItemPrice('');
    }
  };

  const handleAddItem = () => {
    const quantityNumber = Number(itemQuantity);

    if (selectedProductId === '' || quantityNumber <= 0) { alert("Selecione produto e qtd válida."); return; }
    
    const prodIdInt = Number(selectedProductId);
    const prodName = ProductDescriptions[prodIdInt];
    
    const priceNumeric = itemPrice === '' ? 0 : parseFloat(itemPrice);
    const breakNumeric = itemBreak === '' ? 0 : parseInt(itemBreak);

    const newItem: CartItem = {
      productId: prodIdInt, 
      productName: prodName, 
      quantity: quantityNumber, 
      unitPrice: priceNumeric, 
      break: breakNumeric, 
      subtotal: (quantityNumber * priceNumeric) 
    };
    setCart([...cart, newItem]);
    
    setSelectedProductId(''); setItemQuantity(1); setItemPrice(''); setItemBreak('');
  };

  const handleRemoveItem = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleFinalizeSale = async () => {
    if (!customerName || cart.length === 0) { alert("Preencha cliente e itens."); return; }
    
    if (Number(saleStatus) === SaleStatusEnum.PartiallyPaid && amountPaid <= 0) {
        alert("Para status 'Pago Parcialmente', informe um valor maior que zero.");
        return;
    }
    if (amountPaid > totalCarrinho) {
        alert("O valor pago não pode ser maior que o total.");
        return;
    }

    setLoading(true);
    
    const basePayload = {
      city, state, customerName, customerAddress, customerPhone, date: saleDate, discount,
      items: cart.map(item => ({ id: item.itemId, product: item.productId, unitPrice: item.unitPrice, quantity: item.quantity, break: item.break })),
      payments: [{ 
        id: currentPaymentId, 
        paymentDate: saleDate, 
        amount: amountPaid, 
        paymentMethod: Number(paymentMethod) 
      }]
    };
        
    try {
      if (editingId) {
          await api.put('/api/sales', { ...basePayload, id: editingId, status: Number(saleStatus) });
          alert("Atualizado com sucesso!");
          handleCancelEdit(); 
      } else {
          await api.post('/api/sales', { ...basePayload, saleStatus: Number(saleStatus) });
          alert("Registrado com sucesso!");
          setCustomerName(''); setCustomerAddress(''); setCustomerPhone(''); setCart([]); setDiscount(0); setSaleStatus('0'); setAmountPaid(0);
          setCity(''); setState('');
          setSaleDate(getTodayLocal());
      }
      fetchSales(); 
    } catch (error) { console.error("Erro save", error); alert(getApiErrorMessage(error, 'Não foi possível salvar a venda.')); }
    finally { setLoading(false); }
  };

  const handleFilter = () => { setPage(1); fetchSales(); };
  const handleClearFilters = () => { setSearchFilter(''); setStartDateFilter(''); setEndDateFilter(''); setStatusFilter(''); setPaymentMethodFilter(''); setPage(1); fetchSales(true); };
  const toggleRow = (id: string) => setExpandedRow(expandedRow === id ? null : id);
  const getProductNameFromEnumString = (enumKey: string) => { 
      const id = ProductType[enumKey as keyof typeof ProductType]; return ProductDescriptions[id] || enumKey;
  };
  const totalPages = Math.ceil(totalItems / pageSize);
  const inputClass = "w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-slate-900";

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" ref={formTopRef}>
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                {editingId ? <Pencil className="text-orange-600"/> : <ShoppingCart className="text-orange-600"/>}
                {editingId ? 'Editar Venda' : 'Registrar Nova Venda'}
            </h1>
            <p className="text-slate-500">{editingId ? 'Altere os dados abaixo e salve.' : 'Preencha os dados do cliente e itens.'}</p>
        </div>
        {editingId && <Button variant="outline" icon={Undo2} onClick={handleCancelEdit}>CANCELAR EDIÇÃO</Button>}
      </div>
      
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-300 ${editingId ? 'p-4 bg-orange-50/50 rounded-xl border border-orange-100' : ''}`}>
        
        {/* ESQUERDA */}
        <div className="lg:col-span-2 space-y-6">
            {/* Form Cliente */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50"><User className="text-slate-400" size={20}/> <h2 className="font-bold text-slate-800">Dados do Cliente</h2></div>
                <div className="p-6 space-y-6">
                    <div className="flex gap-4 items-end"><div className="flex-1"><label className="block text-sm font-semibold text-slate-700 mb-1">Cliente</label><input type="text" className={inputClass} placeholder="Nome do cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} /></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2"><label className="block text-sm font-semibold text-slate-700 mb-1">Endereço</label><input type="text" className={inputClass} value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} /></div>
                        <div><label className="block text-sm font-semibold text-slate-700 mb-1">Telefone</label><input type="text" className={inputClass} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Cidade</label>
                            <input type="text" className={inputClass} value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Picos" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Estado</label>
                            <input 
                                type="text" 
                                className={inputClass} 
                                value={state} 
                                onChange={e => setState(e.target.value.toUpperCase().slice(0, 2))} 
                                maxLength={2} 
                                placeholder="UF" 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Produto */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50"><Package className="text-slate-400" size={20}/> <h2 className="font-bold text-slate-800">Adicionar Produtos</h2></div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Produto</label>
                            <select className={inputClass} value={selectedProductId} onChange={handleProductSelect}>
                                <option value="">Selecione...</option>
                                {PRODUCT_CATALOG.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                            </select>
                        </div>
                        
                        <div className="md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Qtd.</label>
                            <input 
                                type="number" 
                                className={inputClass} 
                                value={itemQuantity} 
                                onChange={e => setItemQuantity(e.target.value)} 
                                min="1" 
                            />
                        </div>
                        
                        <div className="md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Preço (R$)</label>
                            <input 
                                type="number" 
                                className={inputClass} 
                                value={itemPrice} 
                                onChange={e => setItemPrice(e.target.value)} 
                                placeholder="0.00" 
                            />
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Quebra</label>
                            <input 
                                type="number" 
                                className={inputClass} 
                                value={itemBreak} 
                                onChange={e => setItemBreak(e.target.value)} 
                                placeholder="0" 
                            />
                        </div>
                        
                        <div className="md:col-span-1 flex items-end"><Button variant="soft" icon={Plus} className="w-full" onClick={handleAddItem}>ADICIONAR</Button></div>
                    </div>
                </div>
                <div className="border-t border-slate-200">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs font-bold uppercase border-b border-slate-200">
                            <tr><th className="p-4">Produto</th><th className="p-4 text-center">Qtd</th><th className="p-4 text-center">Unit.</th><th className="p-4 text-center">Quebra</th><th className="p-4 text-center">Total</th><th className="p-4 text-right">#</th></tr>
                        </thead>
                        <tbody>
                            {cart.length === 0 ? (<tr><td colSpan={6} className="p-6 text-center text-slate-400 italic">Nenhum item adicionado.</td></tr>) : (
                                cart.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="p-4 font-medium text-slate-800">{item.productName}</td><td className="p-4 text-center">{item.quantity}</td><td className="p-4 text-center">R$ {item.unitPrice.toFixed(2)}</td><td className="p-4 text-center">{item.break}</td><td className="p-4 text-center font-bold">R$ {item.subtotal.toFixed(2)}</td>
                                        <td className="p-4 text-right"><button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16}/></button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* DIREITA: RESUMO */}
        <div className="lg:col-span-1 space-y-6">
            <div className={`bg-white rounded-xl shadow-sm border overflow-hidden sticky top-6 ${editingId ? 'border-orange-200 ring-2 ring-orange-100' : 'border-slate-200'}`}>
                <div className="p-6 border-b border-slate-100 bg-slate-50/50"><h2 className="font-bold text-slate-800">Resumo Financeiro</h2></div>
                <div className="p-6 space-y-6">
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>R$ {subtotalCarrinho.toFixed(2)}</span></div>
                        <div className="flex justify-between items-center text-slate-500">
                            <span>Desconto (R$)</span>
                            <input 
                                type="number" 
                                className="w-24 px-2 py-1 text-right border border-slate-300 rounded outline-none focus:border-orange-500" 
                                value={discount === 0 ? '' : discount} 
                                onChange={e => setDiscount(Number(e.target.value))} 
                                placeholder="0.00"
                            />
                        </div>
                        <div className="flex justify-between font-bold text-xl text-slate-800 pt-4 border-t border-slate-100"><span>Total</span><span>R$ {totalCarrinho.toFixed(2)}</span></div>
                    </div>
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status da Venda</label>
                            <select className={`${inputClass} font-medium ${saleStatus === '2' ? 'text-emerald-600 bg-emerald-50' : 'bg-slate-50'}`} value={saleStatus} onChange={e => setSaleStatus(e.target.value)}>
                                {Object.entries(SaleStatusDescriptions).map(([id, label]) => (<option key={id} value={id}>{label}</option>))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Método Pagamento</label>
                            <select className={inputClass} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                {Object.entries(PaymentMethodDescriptions).map(([id, label]) => (<option key={id} value={id}>{label}</option>))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Valor Pago</label>
                            <input 
                                type="number" 
                                className={`w-full px-4 py-2.5 border rounded-lg outline-none text-right font-bold ${Number(saleStatus) === SaleStatusEnum.PartiallyPaid ? 'border-orange-400 bg-white text-orange-600 ring-2 ring-orange-100' : 'border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed'}`}
                                value={amountPaid === 0 ? '' : amountPaid} 
                                onChange={e => setAmountPaid(Number(e.target.value))} 
                                disabled={Number(saleStatus) !== SaleStatusEnum.PartiallyPaid} 
                                placeholder="0.00"
                            />
                            {remainingBalance > 0 && (<p className="text-xs text-red-500 text-right mt-1 font-bold">Restante: {formatMoney(remainingBalance)}</p>)}
                        </div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data Venda</label><input type="date" className={inputClass} value={saleDate} onChange={e => setSaleDate(e.target.value)} /></div>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <Button variant="primary" icon={loading ? Loader2 : (editingId ? Pencil : Save)} className="w-full justify-center" onClick={handleFinalizeSale} disabled={loading}>
                        {loading ? 'PROCESSANDO...' : (editingId ? 'SALVAR ALTERAÇÕES' : 'FINALIZAR VENDA')}
                    </Button>
                </div>
            </div>
        </div>
      </div>

      {/* --- HISTÓRICO --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Histórico de Vendas</h2>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase mb-1">Buscar</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg outline-none" placeholder="Cliente ou Nota..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleFilter()} /></div></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1">Data Início</label><input type="date" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none" value={startDateFilter} onChange={e => setStartDateFilter(e.target.value)} /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1">Data Fim</label><input type="date" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none" value={endDateFilter} onChange={e => setEndDateFilter(e.target.value)} /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1">Status</label><select className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Todos</option>{Object.entries(SaleStatusDescriptions).map(([id, label]) => (<option key={id} value={id}>{label}</option>))}</select></div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" size="sm" icon={pdfLoading ? Loader2 : FileText} onClick={handleGeneratePdfReport} disabled={pdfLoading}>
                        {pdfLoading ? 'GERANDO...' : 'RELATÓRIO GERAL'}
                    </Button>
                    <Button variant="outline" size="sm" icon={X} onClick={handleClearFilters}>LIMPAR</Button>
                    <Button variant="soft" size="sm" icon={Filter} onClick={handleFilter}>FILTRAR</Button>
                </div>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase border-b border-slate-200">
                    <tr><th className="p-4 w-10"></th><th className="p-4">Nº Nota</th><th className="p-4">Cliente</th><th className="p-4 text-center">Data</th><th className="p-4 text-center">Itens</th><th className="p-4 text-center">Total</th><th className="p-4 text-center">Saldo Dev.</th><th className="p-4 text-center">Status</th><th className="p-4 text-right">Ações</th></tr>
                </thead>
                <tbody className="text-slate-600 divide-y divide-slate-100">
                    {tableLoading ? (<tr><td colSpan={9} className="p-8 text-center"><div className="flex justify-center gap-2"><Loader2 className="animate-spin"/> Carregando...</div></td></tr>) : sales.length === 0 ? (<tr><td colSpan={9} className="p-8 text-center text-slate-500">Nenhuma venda encontrada.</td></tr>) : (
                        sales.map((sale) => (
                            <React.Fragment key={sale.id}>
                                <tr className={`transition-colors ${expandedRow === sale.id ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                                    <td className="p-4 text-center"><button onClick={() => toggleRow(sale.id)} className="text-orange-500 hover:text-orange-600 transition-colors">{expandedRow === sale.id ? <MinusCircle size={20} fill="#fff7ed" /> : <PlusCircle size={20} />}</button></td>
                                    <td className="p-4 font-mono text-xs text-slate-500">#{sale.noteNumber}</td>
                                    <td className="p-4 font-bold text-slate-800">{sale.customerName}</td>
                                    <td className="p-4 text-center text-xs">{formatDate(sale.saleDate)}</td>
                                    <td className="p-4 text-center">{sale.itemsCount}</td>
                                    <td className="p-4 text-center font-bold text-slate-800">{formatMoney(sale.totalNet)}</td>
                                    <td className="p-4 text-center font-bold text-red-600">{formatMoney(sale.remainingBalance)}</td>
                                    <td className="p-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold border ${sale.status === SaleStatusEnum.Confirmed ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>{SaleStatusDescriptions[sale.status]}</span></td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                title="Recibo Individual" 
                                                className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
                                                onClick={() => handlePrintReceipt(sale.id, sale.noteNumber)}
                                                disabled={receiptLoadingId === sale.id}
                                            >
                                                {receiptLoadingId === sale.id ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16}/>}
                                            </button>
                                            
                                            <TableAction variant="edit" onClick={() => handleEdit(sale)} />
                                            <TableAction variant="delete" onClick={() => handleDelete(sale.id)} />
                                        </div>
                                    </td>
                                </tr>
                                {expandedRow === sale.id && (
                                    <tr className="bg-slate-50/50"><td colSpan={9} className="p-4">
                                            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm p-4">
                                                <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Itens da Venda</h4>
                                                <table className="w-full text-sm text-left mb-4"><thead className="bg-slate-100 text-xs font-bold text-slate-500 uppercase"><tr><th className="p-3">Produto</th><th className="p-3 text-center">Qtd</th><th className="p-3 text-center">Unit.</th><th className="p-3 text-right">Subtotal</th></tr></thead><tbody>{sale.items.map((item, idx) => (<tr key={idx} className="border-b border-slate-50"><td className="p-3 font-medium">{getProductNameFromEnumString(item.product)}</td><td className="p-3 text-center">{item.quantity}</td><td className="p-3 text-center">{formatMoney(item.unitPrice)}</td><td className="p-3 text-right font-bold">{formatMoney(item.subtotal)}</td></tr>))}</tbody></table>
                                                <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider mt-4">Pagamentos</h4>{sale.payments && sale.payments.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">{sale.payments.map((pay, idx) => (<div key={idx} className="flex justify-between items-center p-3 bg-emerald-50 rounded border border-emerald-100"><span className="text-xs font-bold text-emerald-800">{PaymentMethodDescriptions[pay.paymentMethod]}</span><span className="text-sm font-bold text-emerald-700">{formatMoney(pay.amount)}</span></div>))}</div>) : (<p className="text-sm text-slate-400 italic">Nenhum pagamento registrado.</p>)}
                                            </div>
                                    </td></tr>
                                )}
                            </React.Fragment>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between"><span className="text-sm text-slate-500">Total: <strong>{totalItems}</strong> vendas</span><div className="flex items-center gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || tableLoading} className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50"><ChevronLeft size={16} /></button><span className="text-sm font-medium text-slate-700 px-2">{page} de {totalPages || 1}</span><button onClick={() => setPage(p => (totalPages && p < totalPages ? p + 1 : p))} disabled={page >= totalPages || tableLoading} className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50"><ChevronRight size={16} /></button></div></div>
      </div>
    </div>
  );
}
