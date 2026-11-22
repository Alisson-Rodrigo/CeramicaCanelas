import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { Save, Search, Filter, Image as ImageIcon, X, Package, Loader2, ChevronLeft, ChevronRight, Pencil, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TableAction } from '@/components/ui/TableAction';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// ... (Interfaces e Constantes permanecem iguais) ...
interface Category { id: string; name: string; }
interface Product {
  id: string; code: string; name: string; unitOfMeasure: number; stockInitial: number;
  stockMinium: number; stockCurrent: number; value: number; imageUrl?: string;
  isReturnable: boolean; observation: string; categoryId: string; categoryName: string;
}

const UNIT_OF_MEASURE = [
  { value: 0, label: 'Unidade' }, { value: 1, label: 'Quilo' }, { value: 2, label: 'Kit' },
  { value: 3, label: 'Litro' }, { value: 4, label: 'Par' }, { value: 5, label: 'Caixa' }, { value: 6, label: 'Metro' },
];

export function ProductList() {
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10; // Certifique-se que não está 1 aqui para produção

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortOption, setSortOption] = useState('name_asc'); 

  const [formData, setFormData] = useState({
    code: '', name: '', unitOfMeasure: 0, stockInitial: 0, 
    stockMinium: 0, value: 0, isReturnable: 'false', observation: '', categoryId: '',
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => { fetchCategories(); }, []);
  
  // O useEffect chama a busca sempre que a página muda
  useEffect(() => { fetchProducts(); }, [page]); 

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data);
    } catch (error) { console.error(error); }
  };

  // --- CORREÇÃO AQUI ---
  const fetchProducts = async (isReset = false) => {
    setTableLoading(true);
    try {
      let orderBy = 'Name';
      let ascending = true;
      const currentSort = isReset ? 'name_asc' : sortOption;

      switch (currentSort) {
        case 'name_desc': orderBy = 'Name'; ascending = false; break;
        case 'price_asc': orderBy = 'Value'; ascending = true; break;
        case 'price_desc': orderBy = 'Value'; ascending = false; break;
        case 'stock_asc': orderBy = 'StockQuantity'; ascending = true; break;
        case 'stock_desc': orderBy = 'StockQuantity'; ascending = false; break;
        default: orderBy = 'Name'; ascending = true;
      }

      const params = {
        Page: isReset ? 1 : page,
        PageSize: pageSize,
        Search: isReset ? '' : searchTerm,
        OrderBy: orderBy,
        Ascending: ascending,
        CategoryId: isReset ? undefined : (filterCategoryId || undefined),
        MinPrice: isReset ? undefined : (minPrice || undefined),
        MaxPrice: isReset ? undefined : (maxPrice || undefined)
      };

      const response = await api.get('/api/products/paged', { params });
      const data = response.data;
      
      // Lógica robusta para ler o total de itens, independente se o backend manda totalItems ou totalCount
      if (data.items) {
        setProducts(data.items);
        setTotalItems(data.totalItems ?? data.totalCount ?? 0);
      } else if (Array.isArray(data)) {
        setProducts(data);
        setTotalItems(data.length);
      } else {
        setProducts([]);
        setTotalItems(0);
      }
    } catch (error) { console.error(error); } 
    finally { setTableLoading(false); }
  };

  // Ao filtrar, voltamos para a página 1. Se já estiver na 1, o useEffect não roda, então chamamos fetchProducts manual
  const handleFilter = () => { 
      if (page === 1) fetchProducts();
      else setPage(1); 
  };

  const handleClearFilters = () => {
    setSearchTerm(''); setFilterCategoryId(''); setMinPrice(''); setMaxPrice(''); setSortOption('name_asc');
    if (page === 1) fetchProducts(true);
    else setPage(1);
  };

  // ... (Restante das funções: handleInputChange, handleImageChange, handleEdit, etc. MANTENHA IGUAL) ...
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      code: product.code, name: product.name, unitOfMeasure: product.unitOfMeasure, stockInitial: product.stockInitial,
      stockMinium: product.stockMinium, value: product.value, isReturnable: product.isReturnable ? 'true' : 'false',
      observation: product.observation || '', categoryId: product.categoryId
    });
    setImagePreview(product.imageUrl || null);
    setSelectedImage(null);
    if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ code: '', name: '', unitOfMeasure: 0, stockInitial: 0, stockMinium: 0, value: 0, isReturnable: 'false', observation: '', categoryId: '' });
    setSelectedImage(null); setImagePreview(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await api.delete(`/api/products/${id}`);
      alert("Produto excluído com sucesso!");
      if (editingId === id) handleCancelEdit();
      fetchProducts();
    } catch (error) { console.error("Erro delete", error); alert(getApiErrorMessage(error, 'Não foi possível excluir o produto.')); }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data = new FormData();
      data.append('Code', formData.code); data.append('Name', formData.name);
      data.append('UnitOfMeasure', formData.unitOfMeasure.toString());
      data.append('StockInitial', formData.stockInitial.toString());
      data.append('StockMinium', formData.stockMinium.toString());
      data.append('Value', formData.value.toString());
      data.append('IsReturnable', formData.isReturnable === 'true' ? 'true' : 'false');
      data.append('Observation', formData.observation);
      data.append('CategoryId', formData.categoryId);
      if (selectedImage) data.append('Imagem', selectedImage);
      if (editingId) data.append('Id', editingId);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editingId) { await api.put('/api/products', data, config); alert('Produto atualizado!'); } 
      else { await api.post('/api/products', data, config); alert('Produto cadastrado!'); }
      
      handleCancelEdit(); fetchProducts(); 
    } catch (error) { console.error("Erro save", error); alert(getApiErrorMessage(error, 'Não foi possível salvar o produto.')); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400";
  const totalPages = Math.ceil(totalItems / pageSize);
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cadastro de Produtos</h1>
          <p className="text-slate-500">Gerencie o estoque.</p>
        </div>
      </div>

      {/* --- FORMULÁRIO --- */}
      <div ref={formRef} className={`rounded-xl shadow-sm border overflow-hidden transition-colors duration-300 ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${editingId ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
              {editingId ? <Pencil size={20} /> : <Package size={20} />}
            </div>
            <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Produto' : 'Novo Produto'}</h2>
          </div>
          {editingId && <button onClick={handleCancelEdit} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors"><X size={16} /> Cancelar Edição</button>}
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Código *</label><input name="code" value={formData.code} onChange={handleInputChange} type="text" className={inputClass} placeholder="Ex: MC-001" /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Nome *</label><input name="name" value={formData.name} onChange={handleInputChange} type="text" className={inputClass} placeholder="Nome do Produto" /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Categoria *</label><select name="categoryId" value={formData.categoryId} onChange={handleInputChange} className={inputClass}><option value="">Selecione...</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div><label className="block text-sm font-semibold text-slate-700 mb-1">Preço (R$)</label><input name="value" value={formData.value} onChange={handleInputChange} type="number" step="0.01" className={inputClass} /></div>
             <div><label className="block text-sm font-semibold text-slate-700 mb-1">Estoque Inicial</label><input name="stockInitial" value={formData.stockInitial} onChange={handleInputChange} type="number" className={inputClass} /></div>
             <div><label className="block text-sm font-semibold text-slate-700 mb-1">Estoque Mín.</label><input name="stockMinium" value={formData.stockMinium} onChange={handleInputChange} type="number" className={inputClass} /></div>
             <div><label className="block text-sm font-semibold text-slate-700 mb-1">Unidade Medida</label><select name="unitOfMeasure" value={formData.unitOfMeasure} onChange={handleInputChange} className={inputClass}>{UNIT_OF_MEASURE.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">É Retornável?</label><select name="isReturnable" value={formData.isReturnable} onChange={handleInputChange} className={inputClass}><option value="false">Não</option><option value="true">Sim</option></select></div>
            <div className="md:col-span-2"><label className="block text-sm font-semibold text-slate-700 mb-1">Observação</label><input name="observation" value={formData.observation} onChange={handleInputChange} type="text" className={inputClass} placeholder="Detalhes adicionais..." /></div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Imagem do Produto</label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer flex items-center justify-center px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"><ImageIcon size={20} className="mr-2 text-slate-500" /><span className="text-sm font-medium text-slate-700">Escolher Arquivo</span><input type="file" className="hidden" accept="image/*" onChange={handleImageChange} /></label>
              {imagePreview && (<div className="relative w-16 h-16 border rounded-lg overflow-hidden"><img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /><button type="button" onClick={() => { setImagePreview(null); setSelectedImage(null); }} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg"><X size={12} /></button></div>)}
              <span className="text-sm text-slate-900 font-medium">{selectedImage ? selectedImage.name : 'Nenhum arquivo selecionado'}</span>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
          {editingId && <Button variant="outline" icon={Undo2} onClick={handleCancelEdit}>CANCELAR</Button>}
          <Button variant="primary" icon={loading ? Loader2 : Save} onClick={handleSubmit} disabled={loading}>{loading ? 'PROCESSANDO...' : (editingId ? 'ATUALIZAR' : 'SALVAR')}</Button>
        </div>
      </div>

      {/* --- LISTA DE PRODUTOS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Lista de Produtos</h2>
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="md:col-span-4"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buscar</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" className={inputClass} placeholder="Buscar por nome ou código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleFilter()}/></div></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label><select className={inputClass} value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}><option value="">Todas</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço Mín.</label><input type="number" className={inputClass} placeholder="0,00" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} /></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço Máx.</label><input type="number" className={inputClass} placeholder="0,00" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} /></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ordenar Por</label><select className={inputClass} value={sortOption} onChange={(e) => setSortOption(e.target.value)}><option value="name_asc">Nome (A-Z)</option><option value="name_desc">Nome (Z-A)</option><option value="price_asc">Menor Preço</option><option value="price_desc">Maior Preço</option><option value="stock_asc">Menor Estoque</option><option value="stock_desc">Maior Estoque</option></select></div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" icon={X} onClick={handleClearFilters}>LIMPAR</Button><Button variant="soft" icon={Filter} onClick={handleFilter}>FILTRAR DADOS</Button></div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
              <tr><th className="p-4">Imagem</th><th className="p-4">Código</th><th className="p-4">Nome</th><th className="p-4">Categoria</th><th className="p-4">Preço</th><th className="p-4 text-center">Estoque</th><th className="p-4 text-right">Ações</th></tr>
            </thead>
            <tbody className="text-sm text-slate-600">
              {tableLoading ? (<tr><td colSpan={7} className="p-8 text-center"><div className="flex justify-center items-center gap-2 text-slate-500"><Loader2 className="animate-spin" size={20}/> Carregando...</div></td></tr>) : products.length === 0 ? (<tr><td colSpan={7} className="p-8 text-center text-slate-500">Nenhum produto encontrado.</td></tr>) : (
                products.map((product) => (
                  <tr key={product.id} className={`border-b border-slate-100 last:border-0 transition-colors ${editingId === product.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <td className="p-4"><div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200">{product.imageUrl ? (<img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />) : (<ImageIcon size={20} />)}</div></td>
                    <td className="p-4 font-bold text-slate-700">{product.code}</td>
                    <td className="p-4 font-medium text-slate-900">{product.name}</td>
                    <td className="p-4 text-slate-600"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold uppercase">{product.categoryName}</span></td>
                    <td className="p-4 font-medium text-slate-700">{formatCurrency(product.value)}</td>
                    <td className="p-4 text-center"><span className={`font-bold ${product.stockCurrent <= product.stockMinium ? 'text-red-600' : 'text-emerald-600'}`}>{product.stockCurrent}</span></td>
                    <td className="p-4 text-right"><div className="flex justify-end gap-2"><TableAction variant="edit" onClick={() => handleEdit(product)} /><TableAction variant="delete" onClick={() => handleDelete(product.id)} /></div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- RODAPÉ DE PAGINAÇÃO --- */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-sm text-slate-500">Total: <strong>{totalItems}</strong> itens</span>
          <div className="flex items-center gap-2">
            <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1 || tableLoading} 
                className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
            >
                <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-slate-700 px-2">
                Página {page} de {totalPages || 1}
            </span>
            <button 
                onClick={() => setPage(p => p + 1)} 
                disabled={page >= totalPages || tableLoading} 
                className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
            >
                <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
