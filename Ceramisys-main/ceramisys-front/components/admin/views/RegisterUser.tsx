import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, UserPlus, Shield, Mail, Lock, User, 
  Loader2, RefreshCw, ChevronLeft, ChevronRight, Trash2 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

// --- TIPAGEM ---
interface UserItem {
  id: string;
  name: string;
  email: string;
  userName: string;
  roles: string[];
}

interface UserResponse {
  items: UserItem[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- ENUMS ---
const RoleDescriptions: Record<number, string> = {
  0: "Administrador (Admin)",
  1: "Visualizador (Viewer)",
  2: "Financeiro (Financial)",
  3: "Almoxarifado",
  4: "Vendas (Sales)"
};

export function RegisterUser() {
  // --- ESTADOS ---
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingList, setLoadingList] = useState(false); // Inicia false para controlar manualmente
  
  // Form
  const [userName, setUserName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState<string>('1');

  // Tabela
  const [users, setUsers] = useState<UserItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // --- 1. BUSCAR USUÁRIOS ---
  const fetchUsers = useCallback(async (page: number) => {
    setLoadingList(true);
    try {
      const response = await api.get<UserResponse>('/api/user', {
        params: { Page: page, PageSize: pageSize }
      });
      
      // Garante que a lista seja um array mesmo se vier nulo
      const list = response.data.items || [];
      
      setUsers(list);
      setTotalPages(response.data.totalPages || 1);
      
      // Atualiza a página atual com o que veio do backend para manter sincronia
      // Mas se a lista vier vazia e a página for > 1, pode ser necessário voltar no backend.
      if (list.length === 0 && page > 1) {
          // Recursividade de segurança: se pediu pag 2 e veio vazio, tenta pag 1
          fetchUsers(page - 1);
          return;
      }
      
      setCurrentPage(page);

    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  // --- 2. SALVAR ---
  const handleSave = async () => {
    if (!userName || !name || !email || !password) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    if (password !== passwordConfirm) {
      alert("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoadingSave(true);
    try {
      const formData = new FormData();
      formData.append('UserName', userName);
      formData.append('Name', name);
      formData.append('Email', email);
      formData.append('Password', password);
      formData.append('PasswordConfirmation', passwordConfirm);
      formData.append('Role', role);

      await api.post('/api/user', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert("Usuário cadastrado com sucesso!");
      
      // Resetar Form
      setUserName(''); setName(''); setEmail(''); setPassword(''); setPasswordConfirm(''); setRole('1');

      // Recarrega a tabela na página atual
      fetchUsers(currentPage);

    } catch (error: unknown) {
      console.error("Erro cadastro:", error);
      alert(getApiErrorMessage(error, 'Não foi possível cadastrar o usuário.'));
    } finally {
      setLoadingSave(false);
    }
  };

  // --- 3. EXCLUIR (CORRIGIDO) ---
  const handleDelete = async (id: string, userNameItem: string) => {
    if (!window.confirm(`Excluir o usuário "${userNameItem}"?`)) return;

    try {
      // 1. Deleta na API
      await api.delete(`/api/user/${id}`);
      
      // 2. Calcula qual página carregar
      // Se era o único item da página e não estamos na página 1, voltamos uma página.
      const isLastItemOnPage = users.length === 1;
      const isNotFirstPage = currentPage > 1;
      
      const pageToFetch = (isLastItemOnPage && isNotFirstPage) 
        ? currentPage - 1 
        : currentPage;

      // 3. Recarrega a lista com a página correta
      await fetchUsers(pageToFetch);
      
      alert("Usuário excluído.");

    } catch (error: unknown) {
      console.error("Erro exclusão:", error);
      alert(getApiErrorMessage(error, 'Não foi possível excluir o usuário.'));
    }
  };

  // Styles
  const inputClass = "w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white";
  const labelClass = "text-xs font-bold text-slate-500 uppercase mb-1 block";

  const getRoleBadgeColor = (roleName: string) => {
    const r = roleName ? roleName.toLowerCase() : '';
    if (r.includes('admin')) return 'bg-red-100 text-red-700 border-red-200';
    if (r.includes('financial')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (r.includes('sales')) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in pb-16 sm:pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="text-blue-600"/> Gestão de Usuários
            </h1>
            <p className="text-slate-500">Cadastre novos membros e visualize a lista de acessos.</p>
        </div>
      </div>

      {/* FORMULÁRIO */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 w-full">
        <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-lg font-bold text-slate-800">Novo Cadastro</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={labelClass}>Nome Completo</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                        <input type="text" className={inputClass} placeholder="Ex: Jorge Silva" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Login (Usuário)</label>
                    <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                        <input type="text" className={inputClass} placeholder="Ex: jorge.dev" value={userName} onChange={e => setUserName(e.target.value)} />
                    </div>
                </div>
            </div>

            <div>
                <label className={labelClass}>Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input type="email" className={inputClass} placeholder="email@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
            </div>

            <div>
                <label className={labelClass}>Permissão (Role)</label>
                <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <select className={inputClass} value={role} onChange={e => setRole(e.target.value)}>
                        {Object.entries(RoleDescriptions).map(([id, label]) => (
                            <option key={id} value={id}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className={labelClass}>Senha</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input type="password" className={inputClass} placeholder="******" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
            </div>

            <div>
                <label className={labelClass}>Confirmar Senha</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input type="password" className={inputClass} placeholder="******" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} />
                </div>
            </div>
        </div>

        <div className="flex justify-end mt-8 pt-4 border-t border-slate-100">
            <Button 
                variant="primary" 
                icon={loadingSave ? Loader2 : Save} 
                onClick={handleSave} 
                disabled={loadingSave}
                className="w-full md:w-auto"
            >
                {loadingSave ? 'SALVANDO...' : 'CADASTRAR'}
            </Button>
        </div>
      </div>

      {/* TABELA DE USUÁRIOS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <User size={20} className="text-slate-500"/> Usuários Cadastrados
            </h2>
            <button 
              onClick={() => fetchUsers(currentPage)}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Atualizar Lista"
            >
              <RefreshCw size={18} className={loadingList ? 'animate-spin' : ''} />
            </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nome / Login</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Permissões</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingList ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-blue-500" size={24} />
                      <span className="text-sm">Carregando dados...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{user.name}</span>
                        <span className="text-xs text-slate-500">@{user.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.map((r, idx) => (
                          <span key={idx} className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeColor(r)}`}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(user.id, user.name)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
           <span className="text-sm text-slate-500">
             Página <b>{currentPage}</b> de <b>{totalPages}</b>
           </span>
           <div className="flex gap-2">
             <button 
               disabled={currentPage <= 1 || loadingList}
               onClick={() => fetchUsers(currentPage - 1)}
               className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 bg-white shadow-sm"
             >
               <ChevronLeft size={16} />
             </button>
             <button 
               disabled={currentPage >= totalPages || loadingList}
               onClick={() => fetchUsers(currentPage + 1)}
               className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 bg-white shadow-sm"
             >
               <ChevronRight size={16} />
             </button>
           </div>
        </div>

      </div>
    </div>
  );
}
