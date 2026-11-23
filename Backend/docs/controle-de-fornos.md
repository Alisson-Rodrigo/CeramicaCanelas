# Controle de Fornos

## Modelo e regras

- Um registro `KilnFiring` representa uma queima. `KilnName` identifica o forno físico e `Id` identifica a queima. O histórico é central, sem tabela por mês.
- Produtos acabados reutilizam o `ProductType` existente do módulo de Vendas (incluindo tijolos 6/8 furos, blocos, telhas e outros tipos), em vez de vincular produção ao catálogo `Products` do Almoxarifado, que representa itens de estoque. O nome de exibição é guardado como snapshot. Queimadores reutilizam funcionários ativos com função `Queimador`.
- Início/fim são gravados em UTC. A interface e os relatórios mostram horário local de Fortaleza. Duração é derivada por data e hora completas, inclusive entre dias. Até 27h exatas é “Dentro do tempo”; acima disso, “Acima do tempo”.
- A seleção de carregamento reutiliza o catálogo de tipos de produto de Vendas, adaptado somente na Produção: variantes de primeira/segunda linha e caldeado do mesmo formato são agrupadas pelo formato físico (por exemplo, Tijolos 06 Furos); blocos de 9 furos, lajotas, bandas, telhas, especiais e os demais tipos existentes continuam disponíveis. Nenhuma opção, enumeração, regra ou tela de Vendas é alterada.
- A qualidade não é escolhida no carregamento. Ela é lançada na conferência pós-abertura em `KilnFiringQualities`, separada por produto: Primeira linha, Segunda linha, Caldeado, Trincados e Reenfornados. “Peças classificadas” são as unidades que foram separadas nessas categorias após abrir o forno. A soma precisa fechar com o carregado; quebra/perda exige justificativa. “Enfurnado” não é uma categoria de qualidade. “Reenfornados” é uma categoria separada porque foi indicada pela empresa; a aplicação não presume que tenha o mesmo significado de enfurnado.
- Os três tipos históricos de produto (por exemplo, “Tijolos de 2ª 06 Furos”) são normalizados para o tipo físico correspondente quando usados em novas queimas. Queimas já registradas mantêm seus snapshots e categorias existentes; o filtro de produto considera as variantes antigas correspondentes.
- Ao carregar opções em banco onde a migration já está aplicada, o endpoint de opções cria idempotentemente as categorias Trincados e Reenfornados se ainda não existirem. Não há alteração de schema nem migration nesta mudança.
- Categorias: Primeira linha, Segunda linha, Caldeado, Trincados e Reenfornados. As duas últimas são incluídas idempotentemente ao carregar opções em bancos com a migration existente; Admin pode adicionar, renomear ou desativar categorias. Perdas e quebras continuam justificativas, não categorias de produto.
- Registros identificados como teste/demonstração (nome do forno ou responsável contendo “teste”, ou observação marcada `[demo]`) são excluídos de consultas, indicadores e relatórios normais. Nenhum registro foi apagado. Esse marcador textual é uma proteção de apresentação; para novos testes deve-se usar banco descartável, não nomes operacionais.
- Cancelamento é lógico, exige justificativa e mantém o histórico. Não há exclusão comum nem importação automática.

## Acesso e endpoints

Admin e Almoxarifado acessam o módulo e as rotas de queimas. Admin sozinho administra categorias de qualidade. A autorização é verificada pela API.

No frontend, “Produção” é um módulo próprio na navegação global para Admin e Almoxarifado; o Controle de Fornos não fica dentro do menu do Almoxarifado. A área mantém a navegação, o tema e o sino de notificações do sistema.

- `GET /api/kiln-firings/options`: produtos, queimadores e categorias ativas.
- `GET /api/kiln-firings`: filtros de período, forno, queimador, produto, duração e conferência; ordena por início decrescente e paginação (máximo 100 por página).
- `GET /api/kiln-firings/indicators`: total de queimas e peças, agregação dinâmica por nome/tipo de produto, duração média, queimas acima de 27h e conferências pendentes para o período.
- `POST /api/kiln-firings`: registra uma queima e associa produtos/queimadores existentes.
- `PUT /api/kiln-firings/{id}`: edita os dados de uma queima ainda sem conferência de qualidade. Não permite reescrever resultados após a abertura.
- `PUT /api/kiln-firings/{id}/quality`: substitui a conferência da queima, guardando os dados anteriores em auditoria como totais e estado, sem gravar o payload.
- `POST /api/kiln-firings/{id}/cancel`: recebe `{ "reason": "..." }`, valida justificativa e faz cancelamento lógico; mantém o registro e audita a operação.
- `GET /api/kiln-firings/report.pdf` e `GET /api/kiln-firings/{id}/report.pdf`: relatório A4 paisagem com a logo oficial `Backend/CeramicaCanelas.WebApi/wwwroot/base/Logo.png`, período/filtros, geração local, indicadores, tabela repetida por página, qualidade, identificador, fonte e paginação.
- `GET /api/kiln-firings/report.xlsx`: arquivo `.xlsx` com abas Resumo, Queimas e Qualidade, logo oficial, valores numéricos/datas, filtros de tabela, cabeçalho congelado e alertas condicionais de prazo/conferência. É filtrado pelas datas de início/fim; sem datas, exporta o histórico todo.
- `POST /api/kiln-firings/quality-categories` e `PATCH /api/kiln-firings/quality-categories/{id}`: manutenção administrativa das categorias.

As mutações de negócio usam o writer de auditoria central e catálogo de mensagens amigáveis; consultas paginadas/indicadores e downloads PDF/XLSX entram na captura central, incluindo o tipo do arquivo. Não são logados corpos, observações, justificativas, nomes dos participantes nem conteúdo de arquivo. Os logs seguem retenção técnica de 365 dias (configurável, 30–3650); histórico de produção não tem expurgo automático.

## Banco e dados

A migration incremental `20261122190000_AddKilnFiringControl` adiciona `KilnFirings`, `KilnFiringProducts`, `KilnFiringBurners`, `KilnQualityCategories` e `KilnFiringQualities`, índices/chaves e três opções iniciais. Não modifica nem remove dados existentes. Foi aplicada em 22/11/2026 no ambiente local `Development`, banco `ceramicacanelas_local`, e verificada em `__EFMigrationsHistory`. Nenhuma planilha foi importada; a planilha mensal não estava presente entre os arquivos acessíveis nesta tarefa.

O banco local contém um registro intencionalmente identificado como `Forno de teste local`, criado pela API com o ator sintético `Teste local`. A API agora o exclui das consultas, indicadores, relatórios e ações normais por seu nome/ator. O registro não foi removido nem alterado.

## Validação desta implementação

- Frontend: módulo `Produção` separado do Almoxarifado, com navegação global para Admin e Almoxarifado.
- Ambiente local: `ceramicacanelas-local-api` em `Development`; migration aplicada e registro de teste criado via endpoint protegido da API.
- Comandos: `dotnet tool install --tool-path /tmp/ceramica-tools dotnet-ef --version 8.0.17` (no container local); `dotnet-ef migrations script 20261122174554_AddCentralAuditAndNotifications 20261122190000_AddKilnFiringControl ...`; `dotnet-ef database update 20261122190000_AddKilnFiringControl ...`; `dotnet test CeramicaCanelas.Tests/CeramicaCanelas.Tests.csproj --no-restore`; `npm exec tsc -- --noEmit`; ESLint nos componentes alterados; `node --test tests/*.test.cjs`; `npm run build`.

- Frontend: `node --test tests/*.test.cjs` — 41 testes passaram.
- Frontend: `npm exec tsc -- --noEmit` — passou.
- Frontend: ESLint nos arquivos alterados — passou.
- Frontend: `npm run build` — passou.
- Backend: build da API e execução da migration realizados no container local com SDK 8.0.428.
- Ajuste do formulário/relatórios: `POST` com finalização anterior ao início retorna HTTP 400 com explicação e não grava a queima; PDF validado com HTTP 200 e assinatura `%PDF-`; XLSX do período validado com HTTP 200, pacote ZIP íntegro e a queima do período presente na planilha. Exportações XLSX ficaram registradas na auditoria como `ExportFormat=XLSX` no módulo Produção.
- Backend: `dotnet test CeramicaCanelas.Tests/CeramicaCanelas.Tests.csproj --no-restore` — 147 passaram; 5 testes de auditoria PostgreSQL foram pulados por dependerem de `AUDIT_TEST_POSTGRES` descartável.
- Frontend: `npm exec tsc -- --noEmit` e ESLint em `KilnControl.tsx`/`KilnLayout.tsx` — passaram.

### Revisão do catálogo de produtos e relatórios

- O formulário de carga usa os tipos físicos derivados do catálogo de Vendas, agrupando variantes comerciais de primeira/segunda linha e caldeado sem alterar Vendas. A conferência continua classificando a qualidade somente após a abertura.
- Foi acrescentada edição de queimas ainda não conferidas, motivo obrigatório no cancelamento, bloqueio de conferência antes do término e exclusão de registros explicitamente marcados como teste das telas e relatórios. Esses registros não foram apagados nem alterados.
- PDF e XLSX usam a logo oficial. O XLSX contém resumo, queimas e qualidade; a planilha sintética foi aberta/renderizada com LibreOffice para inspeção visual. Nenhuma planilha de referência do negócio foi encontrada no repositório.
- Verificações desta revisão: testes backend — 153 passaram, 5 testes PostgreSQL foram ignorados por não haver `AUDIT_TEST_POSTGRES`; `npm exec tsc -- --noEmit`, ESLint em `KilnControl.tsx`/`KilnLayout.tsx` e `git diff --check` passaram. Os testes direcionados de PDF e XLSX também passaram; a renderização sintética do PDF foi inspecionada.
- Na revisão de implementação anterior, não foi executada escrita da API contra o banco persistente; edição e cancelamento foram cobertos por validação/unitários. A seção seguinte registra a ativação e os testes funcionais locais autorizados nesta rodada.

### Ativação e verificação funcional local — 22/11/2026

- Alvo confirmado: `ceramicacanelas-local-db`, PostgreSQL `ceramicacanelas_local`; `ceramicacanelas-local-api`, `Development`, `localhost:5087`; frontend Next.js em `localhost:3000`.
- `20261122190000_AddKilnFiringControl` já constava em `__EFMigrationsHistory`; a migration foi revisada e não foi reaplicada. O `Up` cria apenas as cinco tabelas do Controle de Fornos, índices/chaves e três categorias iniciais. Não modifica dados ou tabelas existentes.
- Antes das escritas, foi criado e validado um dump privado em `/tmp/ceramicacanelas-local-before-kiln-tests-20261123T000740Z.dump` (horário UTC; `pg_restore --list` passou; modo `0600`).
- Reinício executado: PostgreSQL local e API reiniciados; o Next.js foi reiniciado no processo local. Swagger/API e frontend responderam HTTP 200. Após correções de edição e conferência, a API foi recompilada sem warnings e reiniciada novamente.
- Teste funcional autenticado contra a API e PostgreSQL locais: não autenticado recebeu 401; Admin acessou opções e operações; Almoxarifado acessou as rotas do módulo e recebeu 403 para manutenção de categorias.
- Foram cadastradas 10 queimas `Forno QA 01` a `Forno QA 10`, com notas identificando o lote como teste. Testados listagem, paginação, validação de filtros, filtro de forno/produto/duração, detalhes, indicadores, edição, conferência de qualidade, bloqueio de edição após conferência, cancelamento lógico, criação/desativação de categoria e exportação PDF individual, PDF por período e XLSX por período (assinaturas `%PDF` e ZIP conferidas). Uma queima foi cancelada no teste; restam 9 ativas e 1 cancelada, mantidas no histórico local. Uma categoria `QA` foi criada e deixada inativa para não aparecer como opção.
- O teste HTTP encontrou duas falhas 500 na substituição de itens durante edição/conferência, causadas pelo rastreamento de entidades com GUID pré-gerado. A inclusão agora marca explicitamente produtos, queimadores e classificações como entidades novas. Edição, conferência e demais fluxos foram repetidos e passaram.
- Verificações: `docker exec -w /workspace/Backend ceramicacanelas-local-api dotnet build CeramicaCanelas.WebApi/CeramicaCanelas.WebApi.csproj --no-restore` — passou sem warnings; `dotnet test CeramicaCanelas.Tests/CeramicaCanelas.Tests.csproj --no-restore` — 153 passaram, 5 testes PostgreSQL de auditoria foram ignorados por dependerem de `AUDIT_TEST_POSTGRES`; `npm exec tsc -- --noEmit`, ESLint nos componentes de Produção e `git diff --check` — passaram.

Para outros ambientes, gere e revise o SQL com `dotnet ef migrations script` e aplique a migration somente depois de selecionar e confirmar o banco-alvo. A aplicação em `Development` não altera outros ambientes.
