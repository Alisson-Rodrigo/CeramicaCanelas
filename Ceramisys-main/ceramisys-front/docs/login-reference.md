# Login — referência visual

Referência fornecida: public/references/Login Cerâmica Canelas – Gestão Integrada.png (1672 × 941).

## Direction contract
THESIS: reproduzir a composição fornecida, com autenticação interna preservada.
OWN-WORLD: laranja #F45100, branco aquecido, texto #111827; Geist local, campos cinza-claro, bordas suaves.
STORY: identificar Cerâmica Canelas e autenticar com usuário/senha já existentes.
FIRST VIEWPORT: painel institucional à esquerda (~55%, corte inclinado); cartão à direita (~45%), centralizado, com cadeado, credenciais e botão laranja.
FORM: seed: none (pinned). “Não quero uma interpretação livre da imagem”; “Utilize dois painéis principais”.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Fotografia pendente
Não existe fotografia industrial original nos assets. A montagem de referência não é usada como imagem de fundo, pois contém textos e controles. O painel usa fundo marrom provisório.
Para concluir a parte fotográfica, fornecer public/images/login-factory.jpg e definir FACTORY_PHOTO_SRC = '/images/login-factory.jpg' em components/auth/LoginBrandPanel.tsx. O componente usa next/image, object-fit: cover e foco em 64% do eixo horizontal. Ajustar esse foco à foto recebida.

## Assets e escopo
Marca: public/icons/logo.png, existente e preservada; apresentação circular por CSS, sem edição do arquivo. O logotipo da referência é diferente do asset oficial disponível, que foi priorizado.
Fonte: Geist Latin variável, já distribuída com a versão instalada do Next.js; cópia local, licença SIL OFL em app/auth/login/fonts/OFL.txt. Origem: https://github.com/vercel/geist-font. Nenhuma dependência nova.
Estilos restritos a components/auth/login.module.css. API, cookies, validação Zod e redirecionamento existentes preservados. Não afeta recuperação de senha, Home ou módulos.
