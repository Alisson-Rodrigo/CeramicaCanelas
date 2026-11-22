# Compatibilidade de prestadores

Código da interface compartilhada anterior, sem ligação na navegação ou nas rotas ativas. Preservado sem alteração de regras/serviços porque também contém fluxos de prestadores, fora do escopo desta reorganização. Os contêineres antigos PaymentsLayout e PaymentsSidebar foram removidos. Não importar estas telas na interface de Funcionários.

A interface ativa está em /dashboard/payments e usa exclusivamente /api/employee-payments. Os utilitários e contratos de lib/payments.ts continuam preservados. O antigo teste de navegador está arquivado em tests/legacy, pois depende da interface substituída; não é um teste executável do módulo atual.
