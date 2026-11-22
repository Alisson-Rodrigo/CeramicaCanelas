> Documento histórico da interface substituída. Consulte funcionarios.md para o módulo ativo em /dashboard/payments. As telas referidas abaixo foram arquivadas em components/payments/legacy; os contêineres de navegação antigos foram removidos. Prestadores permanecem fora da reorganização atual.

# Integração de pagamentos

A cópia recebida em 14/11/2026 usa Next.js 16, React 19, TypeScript e Axios, e já possuía um módulo parcial. A implementação amplia esse módulo e mantém o menu, a sessão por `auth_token`, o cliente HTTP e o visual administrativo existentes. Não usa o carregador Blazor mencionado no inventário fornecido. Não foram encontrados AGENTS.md aplicáveis nem os fontes de pagamentos nas pastas locais de backend; os contratos fornecidos são a referência desta integração.

## Arquivos e responsabilidades

- `lib/payments.ts`: DTOs dos novos fluxos, transporte no cliente compartilhado, multipart, entrada decimal, datas locais e retomada de JSON PascalCase/duplamente codificado. Não calcula folha, bônus, faltas ou DSR.
- `components/payments/views/FinancialPeople.tsx`: abas de funcionários/prestadores, criação financeira, valores/bonificação/admissão, autorização individual de DSR e situação. Seleção operacional por ID apenas para Admin/Almoxarifado; Financial não consulta Employees.
- `components/payments/views/PaymentWorkspace.tsx`: ocorrência única central, edição/cancelamento com revisão, confirmação explícita de correção fechada, contador, resumo mensal, ajustes/liquidação, auditoria e DSR com consulta dos meses das origens semanais.
- `components/payments/views/Payments.tsx`: apuração por categoria, parcela do contador nas duas quinzenas, memória retornada pela API, preparações com revisão, fechamento, histórico/pagamento, PDFs, vales e novas vigências de regras.
- `PaymentsSidebar.tsx` e `PaymentsLayout.tsx`: entrada de ocorrências/resumos e persistência da navegação. O dashboard já restringia o módulo a Financial/Admin.

## Operação

1. Cadastre a pessoa financeira e seus valores. Nome/categoria/vínculo são definidos na criação; o backend permite editar somente valores/admissão/autorização e situação. Deixar admissão vazia na edição preserva a anterior. Zero e false são enviados explicitamente.
2. Registre as faltas em **Ocorrências e resumos**. Observação não abona automaticamente a falta. Para cancelar, edite o registro existente. Correção após fechamento exige motivo e confirmação; não altera o snapshot. Nova ocorrência retroativa continua sujeita ao bloqueio do servidor.
3. Em **Cálculo**, selecione pessoa, competência e quinzena. Uma preparação válida é retomada automaticamente. Funcionário exige valor do contador nas duas quinzenas, sem o bônus que o backend adiciona. Primeira quinzena de funcionário não oferece horas, vales ou rubricas manuais. Minutos de prestador exigem configuração no servidor.
4. Gere a prévia e confira os valores retornados. Salvar em aberto/conferência exige formulário calculável. Fechar recalcula no servidor, registra snapshot e consome os vales/DSR pertinentes. Não significa pagamento. A memória exibida após fechar é consultada novamente no servidor.
5. Registre o pagamento separadamente no **Histórico**, informando data/hora local convertida em UTC. Em falha incerta, a tela consulta o histórico e bloqueia repetição sobre estado não verificado. Fechamento existente pode ser consultado, mas não reaberto/cancelado pela UI.
6. Use **Resumo e ajustes** para diferenças posteriores: valor com sinal, referência única, motivo e liquidação independente. Totais originais e ajustes, inclusive pendentes, aparecem separados. Não há compensação automática na próxima parcela.
7. PDFs de pagamentos/bônus ficam no histórico e usam somente filtros suportados. Selecionar pessoa delimita o relatório; não há filtro de categoria no servidor. O resumo do contador é atual e pode ser copiado localmente; não registra envio.

Erros de fontes auxiliares são independentes. Faltas e preparações mantêm a revisão do servidor; conflito exige recarregar/reconferir, sem sobrescrita automática com uma revisão nova. Trocar pessoa/competência descarta respostas anteriores. Observações, nomes e auditoria são renderizados como texto por React.

## Verificação local

Dependências existentes, sem instalação de framework de testes:

```powershell
npm.cmd run build
npm.cmd run test:payments
node node_modules/eslint/bin/eslint.js components/payments lib/payments.ts tests/payments.test.cjs tests/payments-browser.cjs
```

Os sete testes de contrato verificam multipart/zero/false/omissão, arrays, parcela zero do contador, bloqueio de entradas monetárias ambíguas, retomada de preparações, revisão/data de faltas, resposta 204, referência exata de liquidação e mensagens HTTP. Usam transporte simulado, sem rede.

Para o smoke de navegador, finalize o build antes de iniciar um servidor dedicado, sem reconstruir `.next` enquanto o servidor estiver em execução:

```powershell
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3417
# Em outro terminal:
npm.cmd run test:payments:browser
```

O script usa Chrome headless e o WebSocket já distribuído com Next. `CHROME_PATH` pode indicar outro executável. `PAYMENTS_TEST_ORIGIN` aceita somente frontend em localhost/127.0.0.1 com porta explícita. O teste intercepta todas as chamadas de API, simula dados e bloqueia outras origens; a identidade é fictícia. Não envia dados ao backend real. A captura mobile fica em `tests/artifacts/`, ignorado pelo Git. Em ambiente restrito, o Chrome apresentou GPU inutilizável; a execução fora do sandbox foi necessária.

## Limites de validação e homologação

- Build, testes de contrato e lint do módulo passaram. O smoke no Chrome passou para prévia, preparação, confirmação única, parcela do contador nas duas quinzenas (incluindo zero), Financial sem Employees, pessoas, largura mobile, ocorrência segura, resumo mensal e histórico. A captura mobile foi inspecionada.
- O smoke usa respostas simuladas: não comprova autenticação real, CORS, aplicação da migração, persistência, PDFs reais nem regras monetárias do backend. Funcionário nas duas quinzenas, revisões concorrentes, correções fechadas, periodicidades de vale, liquidação e demais cenários devem ser homologados também com o servidor isolado.
- Os exemplos numéricos de folha fornecidos não foram recalculados no frontend nem validados contra banco real. Requerem o backend e os testes próprios do servidor.
- Cadastro operacional e financeiro não são atômicos/sincronizados. Não há edição de nome/categoria/vínculo financeiro, apagamento de admissão, reabertura de fechamento, pagamento parcial, comprovante bancário, envio contábil ou edição/exclusão de ajustes/vales por APIs inexistentes.
- Configuração de diária, DSR e autorização individual exige decisão empresarial. Campos opcionais começam vazios e o DSR individual começa desmarcado; a interface não inventa regras nem valida enquadramento jurídico.

Nenhum backend, banco, migração, permissão ou credencial foi alterado. Não houve deploy nem operação contra dados de produção.
