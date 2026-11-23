# Funcionários: contrato manual vigente (16/11/2026)

Substitui as instruções antigas de 40%/60%, FinalNet, bônus na folha e vales no resumo do contador.

## Interface
Pagamentos → Funcionários em /dashboard/payments. A rota antiga redireciona. Mantidos autenticação, Axios e perfis Financial/Admin. Prestadores e demais módulos não foram modificados.

## Pagamento das duas quinzenas
AccountantAmount manual obrigatório, inclusive prévia e preparação; zero permitido. Cadastro mensal é informativo, não preenche pagamento. Só a API calcula líquido e baixa saldo; o frontend exibe sua resposta. Sem FinalNet, adicionais/descontos manuais, bônus ou horas monetizadas.
Vales são opcionais e explícitos, com desconto parcial ou integral, inclusive em registros antigos com AllowPartialDiscount=false. Não há seletor dessa configuração. Pagar não desconta novamente. A segunda exige primeira fechada para prévia e paga para confirmação.
Históricos mantêm itens e valores originais. IsLegacyCalculation identifica o fluxo anterior. Preparações automáticas incompatíveis exigem novo lançamento manual, sem conversão silenciosa.
Travas e consulta após falhas ambíguas são preservadas; nunca há retry automático de pagamento.

## Cadastros e ocorrências
Removidos EmployeeId, seletor operacional e consultas a /api/employees. Cadastro continua com nome, mensal informativo, bônus e admissão.
Faltas e conferência preservam revisão e correções auditadas.
Horas usam GET/POST/PUT por pessoa/data, inteiros não negativos e pelo menos um movimento. Cancelamento é PUT com revisão e motivo; não existe DELETE de horas. Totais/saldo vêm da API, sem conversão em dinheiro.

## Relatórios
Contador: somente na segunda quinzena, resumo MENSAL de id/nome, competência, faltas/datas e horas formatadas. Projeção explícita elimina campos extras. PDF exclusivo /reports/accountant/export; nunca usa PDF salarial. Snapshots opcionais enviam apenas ano/mês/referência; não enviam arquivos ou email.
Internos: bonificação em /reports/bonuses e PDF; CSV e planilha em /reports/vouchers. Bonificação separada mostra dedução bruta/aplicada/final, prévia/snapshot/cancelamento e IncludedInLegacyPayroll. Não existe botão de baixa. Contagens desconhecidas ficam não informadas.
Planilha distingue competência de saldo atual e pago de reservado. CSV do servidor é UTF-8 com BOM, não XLSX. Arquivos autenticados respeitam Content-Type e nome seguro de Content-Disposition, tratam erros JSON e revogam URLs.
Mensal salarial/auditoria permanecem internos. Regras de bônus são somente leitura.

## Verificação
Adapter lib/employee-payments.ts contempla as 41 operações. Componentes em components/employee-payments preservam o design administrativo.
Testes: node --test tests/employee-payments.test.cjs tests/payments.test.cjs
Navegador: npm.cmd run test:employee-payments:browser (apenas localhost, TODAS as APIs simuladas).
Build: npm.cmd run build -- --webpack
TypeScript: node node_modules/typescript/bin/tsc --noEmit --incremental false
Fixtures são testes, não fórmulas no código de produção.

Homologação real pendente: 41 rotas, JWT/CORS, arquivos reais e migração EmployeeManualPaymentsAndSeparatedReports. Nenhuma migração é executada pelo frontend. Em “Sem regra vigente”, orientar o responsável sem criar regras silenciosamente.
