import React from 'react';
import { 
  Users, Server, ShieldAlert, Database, 
  Activity, Calendar, CheckCircle, Clock 
} from 'lucide-react';

export function AdminDashboard() {
  
  // --- DADOS MOCKADOS (Foco em Infra e Sistema) ---
  const stats = [
    { 
      title: "Status do Sistema", 
      value: "Operacional", 
      sub: "Uptime: 99.98%", 
      status: "success", // success, warning, danger
      icon: Server, 
      color: "emerald" 
    },
    { 
      title: "Usuários Online", 
      value: "8 Sessões", 
      sub: "Pico hoje: 14", 
      status: "neutral",
      icon: Users, 
      color: "blue" 
    },
    { 
      title: "Alertas de Segurança", 
      value: "2 Tentativas", 
      sub: "Bloqueios de IP recentes", 
      status: "danger", 
      icon: ShieldAlert, 
      color: "red" 
    },
    { 
      title: "Backup do Banco", 
      value: "Realizado", 
      sub: "Hoje às 03:00 AM", 
      status: "success", 
      icon: Database, 
      color: "purple" 
    },
  ];

  const auditLogs = [
    { user: "Sistema", action: "Backup automático finalizado com sucesso", time: "03:00", type: "system" },
    { user: "Jorge Silva", action: "Alterou permissões do grupo 'Vendas'", time: "08:15", type: "admin" },
    { user: "IP 192.168.1.45", action: "Falha de login (Senha incorreta 3x)", time: "09:20", type: "security" },
    { user: "Maria Oliveira", action: "Reset de senha solicitado", time: "10:05", type: "user" },
    { user: "Jorge Silva", action: "Criou novo usuário 'Roberto'", time: "11:30", type: "admin" },
  ];

  return (
    <div className="space-y-6 animate-fade-in p-6">
      
      {/* HEADER DA HOME */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Painel de Controle (SysAdmin)</h2>
          <p className="text-slate-500">Monitoramento de infraestrutura, segurança e logs do sistema.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 shadow-sm">
          <Calendar size={16} className="text-slate-400"/>
          <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* CARDS DE KPI (INFRAESTRUTURA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const colorClasses: Record<string, string> = {
            emerald: "bg-emerald-50 text-emerald-600",
            blue: "bg-blue-50 text-blue-600",
            red: "bg-red-50 text-red-600",
            purple: "bg-purple-50 text-purple-600",
          };
          
          const iconColor = colorClasses[stat.color] || "bg-slate-50 text-slate-600";
          const isDanger = stat.status === 'danger';
          const isSuccess = stat.status === 'success';

          return (
            <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
              {/* Indicador lateral de status */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${isDanger ? 'bg-red-500' : isSuccess ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>

              <div className="flex justify-between items-start mb-4 pl-2">
                <div className={`p-3 rounded-lg ${iconColor}`}>
                  <stat.icon size={24} />
                </div>
                {isSuccess && <CheckCircle size={18} className="text-emerald-500" />}
                {isDanger && <ShieldAlert size={18} className="text-red-500 animate-pulse" />}
              </div>
              
              <div className="pl-2">
                <h3 className="text-2xl font-extrabold text-slate-800 mb-1">{stat.value}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{stat.title}</p>
                <p className={`text-xs font-medium ${isDanger ? 'text-red-600' : 'text-slate-500'}`}>
                  {stat.sub}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO DE CARGA DO SERVIDOR (Simulado) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Activity size={20} className="text-blue-500"/>
              Carga de Requisições (API)
            </h3>
            <div className="flex gap-2">
                <span className="text-[10px] font-bold px-2 py-1 bg-green-100 text-green-700 rounded">GET</span>
                <span className="text-[10px] font-bold px-2 py-1 bg-yellow-100 text-yellow-700 rounded">POST</span>
                <span className="text-[10px] font-bold px-2 py-1 bg-red-100 text-red-700 rounded">ERR</span>
            </div>
          </div>
          
          <div className="flex-1 flex items-end gap-2 h-64 w-full px-2 border-b border-slate-100 pb-2">
            {[20, 35, 45, 30, 60, 45, 80, 55, 40, 50, 65, 90, 70, 40, 30].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end group cursor-default">
                {/* Barra de Erros (Topo) */}
                {(i === 6 || i === 11) && (
                    <div className="w-full bg-red-400 rounded-t-sm mb-0.5" style={{ height: '15%' }}></div>
                )}
                {/* Barra Principal */}
                <div 
                  className={`w-full rounded-sm transition-all relative group-hover:opacity-80 ${h > 80 ? 'bg-orange-400' : 'bg-slate-700'}`}
                  style={{ height: `${h}%` }}
                >
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
            <span>00:00</span>
            <span>12:00</span>
            <span>23:59</span>
          </div>
        </div>

        {/* LOGS DE AUDITORIA / SEGURANÇA */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Logs de Auditoria</h3>
            <Clock size={14} className="text-slate-400"/>
          </div>
          
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
            {auditLogs.map((log, i) => {
                // Definição de cores baseada no tipo de log
                let borderClass = "border-l-4 border-slate-300";
                if (log.type === 'security') borderClass = "border-l-4 border-red-500 bg-red-50/30";
                if (log.type === 'system') borderClass = "border-l-4 border-purple-500";
                if (log.type === 'admin') borderClass = "border-l-4 border-blue-500";

                return (
                  <div key={i} className={`p-4 hover:bg-slate-50 transition-colors flex flex-col gap-1 ${borderClass}`}>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">{log.user}</span>
                        <span className="text-[10px] font-mono text-slate-400">{log.time}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-tight">{log.action}</p>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">{log.type}</span>
                  </div>
                )
            })}
          </div>
          
          <div className="p-3 border-t border-slate-100 text-center bg-slate-50/30">
            <button className="text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors">Ver histórico completo</button>
          </div>
        </div>

      </div>
    </div>
  );
}
