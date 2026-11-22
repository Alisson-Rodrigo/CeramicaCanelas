# Auditoria, diagnóstico e notificações administrativas

## Modelo e segurança

`SystemAuditEvents` é um registro append-only com três categorias: `BusinessAudit`, `TechnicalDiagnostic` e `SecurityAlert`. A API normal não possui rota de atualização/exclusão; `DefaultContext` também rejeita mutações de evento. `AdminNotifications` é por destinatário e vinculada ao evento; somente `ReadAtUtc` pode ser alterado pelo endpoint próprio. Alertas técnicos/de segurança são destinados a Admin; o endpoint global filtra exclusivamente ações de negócio catalogadas.

As linhas guardam usuário (ID e nome exibido `User.Name` quando disponível), ação, resultado, módulo, tipo/ID do recurso quando encontrado em parâmetros da rota, propriedade escalar `Id` do comando ou objeto de resposta, horário UTC, IP remoto confiável, método, template de rota sem query, status HTTP e trace ID. Nome de usuário/email do token não é persistido como nome exibido. Não são lidos nem persistidos outros campos de corpos, query strings, tokens, cabeçalhos, mensagens/stack traces de exceção ou dados de formulários. Falha de persistência do log não altera a resposta da operação; a contingência usa `ILogger` com categoria, trace e tipo da exceção.

## Cobertura atual e limites

- Captura central: todos os `POST`, `PUT`, `PATCH` e `DELETE` autenticados em `/api`, exceto ações cujo nome contenha `Preview` (prévia não confirmada).
- Leituras sensíveis selecionadas (allowlist `AuditCaptureMiddleware`): listagem de usuários; relatórios e PDFs de vendas, recibo de venda; resumo e relatórios financeiros (fluxo, entradas/saídas, pendências, saldos de clientes, extrato e balancete); painel de estoque/custo por categoria e relatórios de movimentações; consultas de horas, relatórios de vale/bônus, resumo contábil e histórico de auditoria de pagamentos; exportações PDF/CSV de pagamentos; consultas/exportações da própria auditoria.
- Segurança: respostas HTTP 401/403 em `/api`; erros HTTP 5xx como diagnóstico técnico. Falhas de validação que virem 4xx permanecem auditadas se forem operações autenticadas.
- Notificações administrativas: acessos negados/falhas de autenticação e falhas críticas, visíveis no centro Admin. Atualizações globais são limitadas às ações de negócio bem-sucedidas mapeadas em `BusinessUpdateCatalog`; consulta, polling e evento sem mapeamento não geram atualização global.
- Login inválido que termine em 401 é capturado; eventos tratados como HTTP 200 com resultado negativo pelo endpoint de autenticação não são identificados pelo middleware. Recuperação de senha, login bem-sucedido e operações fora da API não têm eventos explícitos ainda.
- O middleware cobre mutações nos módulos de estoque (produtos, categorias, fornecedores, empregados, entrada/saída), vendas, financeiro, usuários e pagamentos, sem salvar payload. O filtro MVC examina exclusivamente a propriedade pública `Id` (Guid, número ou string de até 100 caracteres) dos comandos/objetos de resposta. IDs em campos nomeados de outra forma podem não ser associados.
- Operações GET ainda sem evento (nomes de actions): `ProductsController.GetProducts/GetPagedProducts`, `CategoriesController.GetCategories`, `EmployeesController.GetEmployees/GetEmployeesPages`, `ProductsEntryController.GetProductsEntry/GetPagedProductsEntry`, `ProductsExitController.GetProductsExit/GetPagedProductsExit`; listagens de vendas `SalesController.GetPagedSales/GetPagedPendingSales/GetProductItemsPaged/GetDashboardIndicators`; listagens/históricos de lançamentos, categorias, grupos, clientes e extratos (`LaunchController.GetPagedLaunches/GetDailyHistory`, `LaunchCategoriesController.GetPagesLaunchCategories`, `LaunchCategoryGroupsController.GetPagedLaunchCategoryGroups`, `CustomerController.GetPagedCustomers`, `ExtractController.GetPagedExtracts`); consultas gerais de pagamentos fora da allowlist (ex.: pessoas, vales, cálculos, preparações e ajustes). Consultas GET de configuração comum também ficam de fora. Qualquer nova rota de download/exportação precisa ser incluída em `RelevantReads`.
- O resultado HTTP 2xx significa que a chamada terminou com sucesso HTTP; não representa necessariamente sucesso de regra de negócio se o handler retornar um erro funcional em 200.

## Administração

- `GET /api/admin/audit/events`: filtros UTC, usuário, módulo, ação, resultado e texto; ordenação por data decrescente e paginação (máximo 100).
- `GET /api/admin/audit/export`: CSV limitado a 10 mil linhas, opcionalmente filtrado por período. Acesso é registrado pela allowlist.
- `GET /api/admin/audit/notifications`: lista do Admin autenticado, estado não lido e paginação.
- `PATCH /api/admin/audit/notifications/{id}/read`: altera somente a leitura da notificação pertencente ao Admin autenticado.
- Todas as rotas exigem role `Admin`; criação de usuários também passou a exigir essa role.

## Proxy confiável e retenção

Por padrão, nenhum proxy é confiável. O IP salvo é `Connection.RemoteIpAddress`. Para implantar atrás de proxy, configure somente endereços IP do proxy na configuração `ForwardedHeaders:KnownProxies` (array de strings, por exemplo `127.0.0.1`); encaminha-se um salto (`ForwardLimit=1`). Não confie em `X-Forwarded-For` de clientes diretos.

Índices: horário, categoria+horário, usuário+horário, módulo+horário, ação+horário e destinatário+estado de leitura+data. O filtro textual usa ILIKE em campos estruturais limitados. Retenção padrão: 365 dias, configurável por `AuditRetention:Days` e restringida a 30–3650 dias. Um serviço diário apaga notificações vencidas antes dos eventos vinculados e remove apenas registros anteriores ao corte.

## Migration

A migration `AddCentralAuditAndNotifications` adiciona somente as tabelas e índices novos; não altera nem migra dados existentes. Antes de publicar, aplique a migration com `dotnet ef database update --project CeramicaCanelas.Persistence --startup-project CeramicaCanelas.WebApi` após backup e revisão do ambiente. Esta implementação não aplica migrations automaticamente na inicialização.

## Verificações

Testes adicionados cobrem ator/IP/UTC/resultado, separação de falha técnica e segurança, exclusão de GET comum, proteção contra conteúdo sensível, validação de filtros/paginação, role Admin, imutabilidade, gatilhos de notificação e migration aditiva. Os testes PostgreSQL opcionais usam `AUDIT_TEST_POSTGRES`, criam o schema descartável via `EnsureCreated` e cobrem consultas SQL, escrita/leitura de notificação, retenção e endpoints HTTP/autorização. O proxy é testado com `TestServer` simulando origem confiável e não confiável. Ainda não há teste específico de falha real de persistência do writer. A lista `RelevantReads` deve ser mantida junto a novos endpoints e revisada por módulo.

## Verificação de ambiente e execução em 2026-11-22

- Ambiente detectado: API `ceramicacanelas-local-api`, `ASPNETCORE_ENVIRONMENT=Development`, `localhost:5087` (Swagger respondeu HTTP 200), rede Docker `host`; PostgreSQL `ceramicacanelas-local-db`, imagem `postgres:16-alpine`, publicado somente em `127.0.0.1:5432`, volume persistente `ceramicacanelas-local-db`.
- No primeiro levantamento, antes da autorização explícita do operador, o banco `ceramicacanelas_local` ainda estava na migration `20261121220000_AddAdministrationAuditLogs`; naquele momento não houve alteração do banco. A ativação autorizada posterior está registrada abaixo.
- Para validar sem tocar nesse volume, foi criado o PostgreSQL temporário `ceramicacanelas-audit-it`, sem volume, restrito a `127.0.0.1:55432` e autenticação `trust` apenas no ambiente descartável de teste. Os testes HTTP usaram um TestServer e dados sintéticos.
- Verificações executadas: migration `Up` contém somente `CREATE TABLE` para `SystemAuditEvents` e `AdminNotifications`, chaves/índices novos; não contém remoções nem alterações de tabelas existentes. A suíte verifica o script aditivo.
- Resultado PostgreSQL: 4 testes passaram. Cobriram filtro por período/usuário/módulo/resultado/texto, ordenação e paginação SQL; gravação do evento e notificação individual, ator/IP/UTC/resultado e marcação como lida; remoção após retenção sem remover evento recente; endpoints HTTP, 401 sem token e 403 para role não Admin. A escrita `PATCH .../notifications/{id}/read` apareceu em seguida nos logs com usuário, horário UTC, IP simulado `203.0.113.50` e resultado `Success`. CSV HTTP 200; a resposta de logs/exportação não continha o token usado no teste nem o marcador sintético de corpo/senha.
- Resultado proxy: encaminhamento de IP foi aceito quando o peer era `KnownProxies` e ignorado quando o peer não era confiável; `ForwardLimit=1` e `KnownNetworks` vazio.
- Retenção efetiva do serviço: padrão de 365 dias (`AuditRetention:Days` não configurado no teste); mínimo 30 e máximo 3650 dias.
- Comandos executados (a conexão abaixo não contém senha; o banco de teste usa trust e não é um ambiente de dados reais):

```bash
docker run --rm -d --name ceramicacanelas-audit-it \
  -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=audittest -e POSTGRES_USER=root \
  -p 127.0.0.1:55432:5432 postgres:16-alpine

docker exec -e 'AUDIT_TEST_POSTGRES=Host=127.0.0.1;Port=55432;Database=audittest;Timeout=5' \
  -e 'POSTGRESQL_CONN=Host=127.0.0.1;Port=55432;Database=audittest;Timeout=5' \
  ceramicacanelas-local-api dotnet test \
  /workspace/Backend/CeramicaCanelas.Tests/CeramicaCanelas.Tests.csproj \
  --verbosity minimal -p:UseAppHost=false --filter FullyQualifiedName~AuditPostgresIntegrationTests
```

- A suíte completa executada depois passou 128 testes e marcou 4 testes PostgreSQL como skipped porque essa execução não recebeu `AUDIT_TEST_POSTGRES`; esses mesmos 4 testes passaram na execução isolada indicada acima. `npx tsc --noEmit`, `npm run lint -- --quiet` e `git diff --check` também passaram. O Swagger da API local permaneceu HTTP 200. O container temporário foi encerrado e removido; o estado de migrations do banco persistente continuou em `20261121220000_AddAdministrationAuditLogs`.

- Alvo ativado após autorização explícita: banco `ceramicacanelas_local` no container `ceramicacanelas-local-db`; API `ceramicacanelas-local-api`, ambiente `Development`, `localhost:5087`. Migration aplicada: `20261122174554_AddCentralAuditAndNotifications`. A API foi reiniciada e respondeu HTTP 200 no Swagger.
- Não havia dump prévio do banco. Antes da migration, foi criado `/home/purolight/Backups/CeramicaCanelas/ceramicacanelas_local_pre_audit_20261122.dump` (87.489 bytes, modo `0600`) e restaurado com sucesso num PostgreSQL descartável, sem aplicar migration nesse ambiente. É um backup lógico do banco; não é uma imagem física do volume, WAL ou configuração global do servidor. A configuração anterior da API também foi guardada em arquivo modo `0600` antes de corrigir a credencial local, sem exibir a senha.
- A primeira execução do EF usou a conexão de fallback da factory de design e falhou na autenticação, sem alterar o banco. A execução seguinte recebeu a conexão local por arquivo temporário restrito; o arquivo foi zerado após a aplicação. A migration foi executada somente no alvo autorizado.
- O teste real da API usou tokens sintéticos assinados em memória, sem imprimir nem persistir os tokens. Um perfil sem Admin recebeu 403 e gerou o alerta de segurança esperado; com Admin, eventos/notificações retornaram 200, CSV retornou 200 e marcar notificação como lida retornou 204. A escrita de leitura foi encontrada no log com ator, `Success`, data UTC e IP `127.0.0.1`. O cabeçalho falsificado `X-Forwarded-For: 203.0.113.199` não foi aceito. Tokens e marcador sintético de senha/corpo não apareceram em eventos nem CSV. Notificações geradas pelo smoke test foram marcadas como lidas; nenhum registro de negócio foi criado ou alterado.
- Foi corrigida uma configuração do ASP.NET Core: listas vazias de proxies confiáveis podiam fazer os cabeçalhos encaminhados serem aceitos. `TrustedForwardedHeadersOptions` agora define `ForwardedHeaders.None` quando nenhum IP confiável está configurado; a lista atual contém zero proxies. Com proxies configurados, somente os IPs em `ForwardedHeaders:KnownProxies` são aceitos, com limite de um salto.
- Resultado após a correção: suíte completa com 128 aprovados e 4 testes PostgreSQL opcionais skipped sem `AUDIT_TEST_POSTGRES`; os mesmos quatro testes PostgreSQL passaram em execução isolada anterior. Os 12 testes de captura/proxy passaram após a correção. Swagger HTTP 200, migration presente no histórico, demais testes de endpoints e filtros aprovados. Retenção efetiva permanece 365 dias (`AuditRetention:Days` não definido).
- Comandos principais executados (sem credenciais):

```bash
docker exec ceramicacanelas-local-db sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > /home/purolight/Backups/CeramicaCanelas/ceramicacanelas_local_pre_audit_20261122.dump
docker exec -i ceramicacanelas-local-db pg_restore --list \
  < /home/purolight/Backups/CeramicaCanelas/ceramicacanelas_local_pre_audit_20261122.dump
docker exec -i ceramicacanelas-backup-check pg_restore --exit-on-error --no-owner --no-privileges \
  -U root -d backupcheck \
  < /home/purolight/Backups/CeramicaCanelas/ceramicacanelas_local_pre_audit_20261122.dump
docker exec ceramicacanelas-local-api sh -lc \
  '. /tmp/ceramica-ef-db-connection.sh; dotnet-ef database update AddCentralAuditAndNotifications --project /workspace/Backend/CeramicaCanelas.Persistence --startup-project /workspace/Backend/CeramicaCanelas.WebApi --no-build'
docker restart ceramicacanelas-local-api
docker exec ceramicacanelas-local-api dotnet test \
  /workspace/Backend/CeramicaCanelas.Tests/CeramicaCanelas.Tests.csproj \
  --verbosity minimal -p:UseAppHost=false
```

## Atualizações globais por módulo

**Separação entre atualização e auditoria:** `SystemAuditEvents` preserva nomes técnicos (controller, action, rota e trace) para diagnóstico Admin. `GET /api/notifications` reutiliza `AdminNotifications`, mas só devolve registros vinculados a eventos `BusinessAudit` bem-sucedidos que correspondam a `BusinessUpdateCatalog`. O endpoint resolve mensagem e módulo em português a partir do catálogo e não devolve controller, método, rota, código HTTP ou ID de recurso. Linhas técnicas antigas e ações de negócio sem tradução ficam fora da central; permanecem consultáveis em `GET /api/admin/audit/events` por Admin.

`GET /api/notifications` exige usuário autenticado e pagina até 50 itens. Também valida filtros opcionais por `module`, `status` (`all`, `unread`, `read`), intervalo UTC (`fromUtc`, `toUtc`) e busca (`search`, até 100 caracteres); filtros e contagem/paginação são aplicados no servidor sobre os eventos catalogados e nomes exibidos, sem consultar nomes de endpoints como texto de usuário. A resposta inclui `availableModules`, calculado pelos papéis atuais, para a interface não oferecer filtros de módulos sem acesso. `Almoxarifado` recebe Almoxarifado; `Sales` recebe Vendas; `Financial` recebe Vendas, Financeiro e Pagamentos; `Admin` vê todos os eventos de negócio que tenham mapeamento. `PATCH /api/notifications/{id}/read` só altera notificação do próprio usuário e que ainda esteja dentro dos módulos autorizados. O endpoint `/api/admin/audit/notifications` preserva notificações administrativas de segurança/falhas, restritas a Admin.

O writer mantém todas as gravações na auditoria, mas só cria atualização global se controller, action, verbo, módulo e resultado constarem no catálogo. Downloads também exigem o formato esperado (`ExportFormat`). Ações próprias permanecem no histórico como lidas; o endpoint normaliza como lidas notificações antigas próprias sem alterar o registro. O sino atualiza a cada 45 segundos, deduplica avisos e mostra som/popup apenas para ações de outros usuários. Data e hora são formatadas no cliente para `pt-BR`; o timestamp original continua UTC.

### Catálogo de mensagens de negócio

| Módulo | Ações amigáveis catalogadas |
|---|---|
| Almoxarifado | Cadastro/edição/exclusão de produto, categoria de estoque, funcionário, fornecedor, entrada e saída; conclusão de devolução de estoque |
| Vendas | Cadastro/edição/exclusão de venda e pagamento de venda pendente; download de PDF de itens e recibo |
| Financeiro | Cadastro/edição/exclusão de lançamento, categoria/grupo financeiro, cliente e movimentação; marcação de lançamento pago; download de balancete PDF |
| Pagamentos | Cadastro/edição/exclusão/cancelamento de pessoa, vale, ausência, cálculo, preparação, ajuste; status/pagamento, revisão, horas e resumo contábil; exports PDF/CSV de pagamentos, bônus, vales e relatório contábil |
| Administração | Criação/remoção de usuário e exportação CSV de auditoria |

`BusinessUpdateCatalog` usa a chave explícita `ControllerName|ActionName|HTTP method` e valida o módulo esperado. Nenhum fallback transforma o nome técnico em texto. Ao criar nova operação ou novo download, adicionar mapeamento e teste; até isso acontecer, a operação permanece apenas em `SystemAuditEvents` e não gera atualização global. Configurações de sistema/perfis ainda não têm endpoints de gravação nos controllers atuais.

### Inventário HTTP instrumentado

Todas as operações autenticadas `POST`, `PUT`, `PATCH` e `DELETE` sob `/api` são capturadas centralmente, exceto ações `Preview`. Isso cobre criação, edição, cancelamento, exclusão e mudança de situação expostos nos controllers abaixo. Ações sem contexto suficiente usam o tipo do controller e o ID de rota ou a propriedade escalar `Id`; não se armazena o payload.

| Módulo/rotas | Leituras e downloads explicitamente auditados | Situação |
|---|---|---|
| Almoxarifado: `Products`, `Categories`, `Employees`, `SupplierRepository`, `ProductsEntry`, `ProductsExit`, `Dashboard` | Listas de produtos/categorias/equipe/fornecedores e movimentos; indicadores, painéis e relatórios de estoque/movimentação | Mutação HTTP central e consultas selecionadas cobertas |
| Vendas: `Sales` | Vendas paginadas/pendentes, itens e indicadores; PDF de itens e recibo | Mutação HTTP central, consultas relevantes e PDFs cobertos |
| Financeiro: `Launch`, `LaunchCategories`, `LaunchCategoryGroups`, `Customer`, `Extract`, `DashboardFinancial` | Lançamentos/histórico, categorias/grupos, clientes, extratos, consultas financeiras e balancete PDF | Mutação HTTP central, consultas selecionadas e PDF cobertos |
| Pagamentos: `Payments`, `EmployeePayments` | Pessoas, vales, ausências, DSR, resumos, preparação, cálculos, ajustes, horas, histórico, regras, relatórios e auditoria; exportações PDF/CSV | Leituras de dados pessoais/financeiros e exportações cobertas |
| Usuários e Administração: `Users`, `AuditAdministration` | Listagem de usuários, eventos, exportação CSV e lista administrativa de notificações | Escritas e consultas/exportações administrativas cobertas; endpoints detalhados Admin-only |
| Notificações globais: `Notifications` | Inbox e marcação de leitura | Inbox não é auditada em cada polling; alteração de leitura é auditada sem gerar nova notificação |

Formato de arquivo de `PDF`, `CSV`, `XLS`, `XLSX` ou binário é registrado como contexto limitado (`ExportFormat`), sem conteúdo nem nome de arquivo. IP vem de `RemoteIpAddress` após o middleware de proxy confiável; rastreamento usa `HttpContext.TraceIdentifier`.

### Lacunas e limitações

- Login bem-sucedido e falha de autenticação que a API retorne com HTTP 200 (resultado funcional negativo) não são inferidos pelo middleware. O login inválido que retorna HTTP 401 continua coberto. Recuperação e redefinição de senha passam por rotas Next.js fora de `/api` e ainda não têm auditoria explícita.
- A captura de leituras é uma allowlist (`RelevantReads`), não uma captura de todo `GET`. Consultas de configuração, leituras operacionais comuns e novos endpoints GET ficam sem auditoria até serem classificados e incluídos; ao adicionar download, incluir sua action nessa lista e verificar o Content-Type.
- Os módulos atualmente existentes nos controllers são Almoxarifado, Vendas, Financeiro, Pagamentos, Usuários/Administração e Autenticação. Não foi localizado controller de produção de tijolos/fabricação neste inventário. Se existir em outro serviço, deverá ser instrumentado nele.
- Uma resposta HTTP 2xx ainda não revela erro de regra de negócio codificado no corpo. IDs não convencionais e rotas sem parâmetro identificável podem ficar sem `ResourceId`; IDs diretos ou encontrados em `AuditResourceId` são registrados.
- A página global de notificações usa intervalo de 45 segundos (sem WebSocket/SSE), portanto não é instantânea e depende da sessão autenticada ativa. O som depende de suporte a Web Audio e da primeira interação no navegador. O descarte/expiração é feito pela retenção existente, padrão de 365 dias.

### Verificação da implementação global

Esta alteração reaproveita o schema já aplicado no ambiente local documentado acima; não criou nem executou migration e não alterou dados reais. Em 2026-11-22, após confirmação do alvo, foi reiniciado somente `ceramicacanelas-local-api` (Development, `localhost:5087`); o container PostgreSQL não foi reiniciado.

Validação executada no workspace em 2026-11-22:

- `dotnet test ... --filter FullyQualifiedName~AuditPostgresIntegrationTests`: 5/5 passaram em PostgreSQL descartável `ceramisys-global-notifications-verify` (porta local 55434, sem volume persistente), incluindo autorização, fanout por perfil, propriedade do destinatário, leitura, retenção, filtros, paginação e endpoints Admin. O container foi parado/removido ao fim.
- `dotnet test ...` sem `AUDIT_TEST_POSTGRES`: 129 passaram e 5 testes PostgreSQL foram ignorados por falta de conexão de integração.
- `npx tsc --noEmit` e ESLint dos componentes novos de notificações: passaram.
- `npm run test:notifications`: 4 passaram (não anunciar ação própria, deduplicação, silêncio/interação e polling/acessibilidade).
- `npm run test:payments`: 12 passaram; `npm run test:employee-payments`: 14 passaram.
- `git diff --check`: passou. Após o restart, `http://localhost:5087/swagger/index.html` e `/swagger/v1/swagger.json` responderam HTTP 200; o OpenAPI ativo contém `GET /api/notifications`, `PATCH /api/notifications/{id}/read` e a API permaneceu em Development. A API e o PostgreSQL local permaneceram ativos; não foram feitas escritas nem consultas autenticadas contra o banco persistente.
- O frontend Next.js estava ativo em `localhost:3000`, mas a aba de verificação redirecionou para `/auth/login?session=expired`. Como não havia sessão autenticada disponível, a visualização interativa do sino/contador não foi validada nessa aba; os testes automatizados do componente passaram. Nenhuma credencial foi solicitada ou usada.

### Correção das mensagens da central global (2026-11-22)

- A auditoria administrativa mantém as ações técnicas originais (`Controller`, `Action`, método, rota e trace). A central global agora filtra no servidor somente eventos `BusinessAudit` com resultado `Success` e chave presente no catálogo explícito `BusinessUpdateCatalog`. Consultas GET, polling, eventos técnicos, eventos de segurança e operações sem mapeamento não aparecem como atualizações de negócio.
- As respostas da central não incluem nomes de controller/action, rota, código HTTP ou identificador de recurso. Mensagens e nomes de módulo são produzidos em português pelo catálogo; formatos de exportação também são validados antes de notificar. Não há fallback para texto técnico. Registros globais históricos que não atendem ao catálogo são filtrados, mas permanecem na auditoria Admin.
- O catálogo cobre ações mapeadas de Almoxarifado, Vendas, Financeiro, Pagamentos e Administração, conforme a tabela acima. Novas rotas ou mudanças em nomes de actions precisam ser incluídas explicitamente no catálogo e nos testes. Operações não listadas — incluindo novas ações e exportações — continuam somente nos logs administrativos. O inventário HTTP acima registra consultas não auditadas; leituras comuns permanecem intencionalmente fora da auditoria.
- Ações próprias permanecem no histórico e são apresentadas como lidas no endpoint, evitando popup/som sem alterar o estado persistido. O polling de 45 segundos e a deduplicação por ID foram mantidos. Data e hora são exibidas em `pt-BR`; valores armazenados e enviados pelo backend continuam UTC.
- Validação desta correção: `dotnet test ... --filter FullyQualifiedName~AuditPostgresIntegrationTests` passou 5/5 em PostgreSQL descartável sem volume (`ceramica-update-catalog-test`, porta 55435); o teste cobre entrega por perfil, isolamento e leitura por destinatário, supressão de evento técnico/consulta, filtro de ações sem mapeamento e mensagem amigável. `dotnet test ...` sem `AUDIT_TEST_POSTGRES` passou 130 testes e ignorou 5 testes PostgreSQL opcionais. `npm run test:notifications` passou 5/5; `npx tsc --noEmit`, ESLint dos componentes/utilitário/teste de notificações e `git diff --check` passaram.
- Nenhuma migration foi criada ou executada nesta correção, nenhum serviço foi reiniciado e nenhum registro de negócio real foi criado ou alterado. O processo da API que já estava ativo não foi reiniciado; para carregar esta versão no serviço em execução, ainda é necessário reiniciar a API no ambiente selecionado.
