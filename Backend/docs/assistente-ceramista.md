# Assistente Ceramista

## Experiência e acesso

O assistente é um widget flutuante único, montado no layout raiz da aplicação. Ele aparece para usuários autenticados nos perfis `Admin`, `Viewer`, `Financial`, `Almoxarifado` e `Sales`, inclusive no módulo Pagamentos. O controle de acesso da API permanece em `POST /api/assistant/chat`; ocultar o widget não substitui a autorização do backend. A antiga seção de tela inteira foi removida do menu.

A conversa e as mensagens ficam somente na memória React do navegador enquanto a sessão e o layout raiz permanecerem ativos. Não há tabela, histórico, armazenamento local, auditoria do conteúdo ou persistência de anexos. Atualizar/fechar a aplicação, sair da conta ou desmontar o layout descarta a conversa. O botão “Nova conversa” também limpa o estado local. Arquivos em espera são mantidos apenas na memória e liberados da interface após resposta bem-sucedida; o envio ao Google usa `inlineData`, sem a Files API e sem cópia de arquivo hospedada pelo aplicativo.

O usuário vê a informação de privacidade e confirma explicitamente antes do primeiro envio de texto e antes do primeiro anexo de mídia na sessão do widget. A faixa gratuita pode usar conteúdo enviado para melhorar produtos, e revisores humanos podem ler, anotar e processar entradas e respostas. Não envie CPF, dados bancários, folha nominal, documentos de funcionários/clientes ou informações fiscais confidenciais. O conteúdo sai do ambiente da empresa e é processado pelo Google. Veja os [termos adicionais do Gemini API](https://ai.google.dev/gemini-api/docs/terms) e a [página de preços e uso de dados](https://ai.google.dev/gemini-api/docs/pricing) antes de habilitar o recurso.

## Provedor e modelo

A integração é nativa com a Gemini Developer API, pelo endpoint HTTPS `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`. A chave é enviada no cabeçalho `x-goog-api-key`; não fica na URL, no Next.js, no navegador ou no código. O serviço monta `systemInstruction`, `contents` e partes multimodais `inlineData`. A aplicação não chama ferramentas de busca, não habilita cobrança nem faz fallback para outro provedor/modelo.

Na documentação oficial consultada em **22/11/2026**, `gemini-4-hydrogen` estava listado com entrada/saída sem cobrança na faixa gratuita e modalidades texto, imagem, áudio, vídeo e PDF. Porém, chamadas reais deste ambiente receberam `503` repetidamente. Uma chamada mínima com `gemini-3.5-flash-lite` respondeu `200`; por isso, a configuração local `Development` foi alterada para esse modelo. A tabela oficial atual lista entrada de texto, imagem, vídeo e áudio sem cobrança na faixa gratuita para ele. Isso confirma apenas a chamada de teste, não disponibilidade contínua. A faixa gratuita indica que dados podem ser usados para melhorar produtos do Google. O modelo é lido exclusivamente da configuração e não existe fallback automático. Confirme a disponibilidade atual para o projeto no AI Studio; modelos, preços e limites podem mudar.

Os limites oficiais são medidos em RPM, TPM e RPD por projeto e variam por modelo/conta. O dashboard **AI Studio → Rate limits** mostra a cota efetiva; não há um valor único que este repositório possa garantir. A API também mantém um limite local de 12 chamadas por usuário por minuto. Respostas `429` do provedor são convertidas em mensagem clara e cabeçalho `Retry-After`, usando somente `Retry-After` ou `retryDelay` com limite seguro; o corpo bruto do erro nunca é enviado à interface ou ao log.

### Grounding e fontes

Não há grounding com Google Search nesta configuração. A documentação consultada informa que o recurso não está disponível na faixa gratuita para o modelo escolhido. Portanto o assistente **não faz pesquisa oficial em tempo real e não apresenta citações ou URLs como fontes consultadas**. Para leis, tributos, prazos, sindicatos e convenções, a resposta deve se identificar como geral, perguntar UF/município/CNAE/período quando necessário e orientar confirmação com contador, RH ou fonte oficial atual. Não habilite Search Grounding sem rever a faixa de cobrança e a configuração de faturamento do projeto.

### Configuração do backend

Configure somente no ambiente secreto do processo/container da API:

```text
Assistant__ApiKey=<chave-do-Gemini-Developer-API>
Assistant__Model=gemini-3.5-flash-lite
```

`gemini-3.5-flash-lite` é o modelo atualmente configurado no ambiente local; selecione um modelo que esteja disponível para a conta e faixa desejada no AI Studio. Ambos os valores são necessários. Não coloque essas variáveis em `.env` versionado, `NEXT_PUBLIC_*`, arquivos de configuração commitados ou ferramentas de observabilidade. Para desativar o assistente, remova uma das duas variáveis do ambiente da API; a rota passa a responder `503` sem chamar o provedor. O administrador que opera a API configura os segredos e reinicia o processo conforme o procedimento operacional do ambiente.

## Conteúdo, formatos e limites da aplicação

Formatos multimodais aceitos deliberadamente pela aplicação:

- **Imagens:** PNG, JPEG e WebP; assinatura real do arquivo e MIME declarado são comparados no backend; até 3 imagens, 5 MB cada.
- **Áudio:** WAV PCM mono/estéreo, 16 bits e taxa de amostragem de 8 a 48 kHz; até um arquivo, 3 MB e 90 segundos. O navegador grava e codifica áudio PCM como WAV; arquivo escolhido também precisa passar pela leitura de cabeçalhos/chunks no servidor.
- **Limite agregado:** 4 arquivos e 10 MB por envio, máximo de 11 MB de requisição multipart. Texto: 2.000 caracteres por mensagem, 8.000 caracteres somados e até 10 mensagens alternadas no contexto.

A Gemini API documenta outros MIME types de áudio e imagens, mas a aplicação rejeita os que não validou. **PDF, documentos e vídeo estão desabilitados** e não aparecem como controles. Resposta de voz é oferecida apenas pela síntese de voz local do navegador; áudio gerado pelo provedor não é solicitado. A API revalida tamanho, contagem, MIME, assinatura e duração WAV: as restrições do frontend são apenas feedback rápido.

Anexos e textos não entram em logs de auditoria, diagnósticos, notificações nem logs do adaptador. A captura HTTP mantém apenas metadados técnicos para falhas de segurança/servidor. Erros de provedor registram status/ tipo de exceção, nunca corpo, prompt, resposta, chave ou arquivo. A duração e os bytes da mídia são validados em memória; nenhum anexo é gravado no banco ou em disco pelo aplicativo.

## Respostas e segurança

O prompt de sistema orienta respostas em português brasileiro sobre contabilidade/financeiro, fiscal, RH, sindicatos e cerâmica vermelha; não permite consultar dados internos nem executar ações. Mensagens, imagens e áudio são tratados como entrada não confiável e não podem alterar as instruções do sistema. Em assuntos jurídicos, fiscais, trabalhistas e industriais, o assistente não deve inventar regras ou receitas universais e recomenda validação profissional. A síntese de fala usa `speechSynthesis` do navegador e não envia conteúdo ao provedor.

## Referências oficiais consultadas

- [Catálogo de modelos e modalidades](https://ai.google.dev/gemini-api/docs/models)
- [Preços, faixa gratuita e tratamento de dados](https://ai.google.dev/gemini-api/docs/pricing)
- [Limites de requisição](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Geração de conteúdo e endpoint `generateContent`](https://ai.google.dev/api/generate-content)
- [Formatos de imagem](https://ai.google.dev/gemini-api/docs/image-understanding#supported-formats)
- [Formatos e limites técnicos de áudio](https://ai.google.dev/gemini-api/docs/audio#supported-formats)
- [Grounding com Google Search e citações](https://ai.google.dev/gemini-api/docs/grounding)

Estas referências são dinâmicas. Revise modelo, formatos, termos de privacidade, retenção, cota e custos antes de mudar o modelo ou habilitar ferramentas. Não foi criada migration, configuração de cobrança ou chave de API.
