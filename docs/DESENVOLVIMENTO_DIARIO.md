# 📘 DESENVOLVIMENTO DIÁRIO — BCG PLATFORM

> **Este arquivo concentra TODO o histórico diário do projeto.**
> **NUNCA** criar outros arquivos de resumo.
> Atualizar **somente no FIM DO DIA**.

---

# <span style="color: red; font-size: 28px;">📅 18 DE FEVEREIRO DE 2026 — ENCERRAMENTO (Login, imagens S3, logo sistema, redirect /api/media/proxy)</span>

## **LOGIN FORA DE /api, IMAGENS S3 DIRETAS, LOGO BCG ÚNICA, SMARTIMAGE, REDIRECT 302 HTTPS**

### 🎯 **O QUE FOI FEITO HOJE:**

#### 1. **Login sem depender de /api (Nginx)**

- **Problema:** Com Nginx (`location /api/` → backend), rota Next em `/api/auth/login` nunca era atingida (404 do backend).
- **Solução:** Rota **GET /auth/login** (fora de /api) no Next que lê `next` da query, monta URL do Cognito (oauth2/authorize) e responde **302** para o Hosted UI. Botão "Entrar" em `/login` passou a ser link para **`/auth/login?next=...`**.
- **Arquivos:** `apps/web/src/app/auth/login/route.ts` (criado), `apps/web/src/app/login/page.tsx` (loginHref para `/auth/login`); removido `apps/web/src/app/api/auth/login/route.ts`.

#### 2. **Imagens S3 diretas (sem proxy no fluxo principal)**

- **getPublicImageUrl:** passou a retornar URL absoluta do S3 (ou path relativo prefixado com base S3); revertido uso de `/media/proxy` para imagens.
- **Pipeline de imagens:** restaurado ao last-known-good (S3 direto); removida rota Next `/media/proxy`; `next.config` sem localPattern para `/media/proxy`; `/api/media/proxy` mantido apenas como **redirect** para quem ainda chamar essa URL.

#### 3. **Logo do sistema sempre bcg-logo.png**

- Em **todo o app** (header, layout, login, dashboard sidebar/header, favicon, home): uso exclusivo de **`/bcg-logo.png`**. Removido uso de `group.logoUrl` para a logo do sistema.
- **Arquivos:** `LayoutWithNav.tsx`, `layout.tsx`, `dashboard/layout.tsx`, `DashboardHead.tsx`, `header.tsx`, `sidebar.tsx`, `page.tsx` (home).

#### 4. **SmartImage — imagens S3 sem next/image (evitar 403)**

- **Problema:** next/image retornava 403 para imagens do bucket S3.
- **Solução:** Criados **`isBcgS3Asset(src)`** (`apps/web/src/lib/isBcgS3Asset.ts`) e **`SmartImage`** (`apps/web/src/components/common/SmartImage.tsx`). Para URLs do bucket BCG S3, renderiza **`<img>`** direto (loading lazy); caso contrário usa `next/image`. Substituído `<Image src={getPublicImageUrl(...)}>` por `<SmartImage ...>` nos componentes que exibem imagens S3 (page.tsx, HeroCarousel, ProximosJogosSection, PatrocinadoresSection, LogoCarouselSection, FixtureTeamLogo, BlockRenderer, SectionBlockRenderer, TimesCategoriasSection, NoticiasSection, GaleriaSection, portfolio [slug], GlobalPresenceSection).
- **Resultado:** Request URL das imagens S3 no browser passa a ser `https://bcg-platform-assets...` com status 200; sem `/_next/image` para esses assets.

#### 5. **isSvgUrl restaurado**

- **Problema:** Build falhando com "Export isSvgUrl doesn't exist in target module" (vários componentes importavam de `media-url`).
- **Solução:** Restaurada a função **`isSvgUrl(url)`** em `apps/web/src/lib/media-url.ts`: retorna true se a URL termina em `.svg` ou contém `.svg?`.

#### 6. **Redirect /api/media/proxy — Location sempre HTTPS**

- **Problema:** 302 com **Location: http://www.bostoncitygroup.biz/...** (ou localhost) porque `request.nextUrl`/origin vinha como http/localhost em produção.
- **Solução (apenas em `route.ts`):**
  - **Proto:** `x-forwarded-proto` ou `cloudfront-viewer-protocol` ou fallback `"https"`; primeiro valor (split por vírgula), trim, lowercase; se não for `"https"`, forçar **`proto = "https"`**.
  - **Host:** `x-forwarded-host` ?? `host` ?? `request.nextUrl.host`.
  - **URL absoluta:** `new URL("/media/proxy", \`${proto}://${host}\`)` e `dest.searchParams.set("url", url)`.
  - **Resposta:** `NextResponse.redirect(dest.toString(), 302)` e **Cache-Control: no-store**.
- **Resultado:** `curl -I https://www.bostoncitygroup.biz/api/media/proxy?url=...` retorna **302** com **Location: https://www.bostoncitygroup.biz/media/proxy?url=...**.

---

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**Criados:**  
`apps/web/src/app/auth/login/route.ts`, `apps/web/src/lib/isBcgS3Asset.ts`, `apps/web/src/components/common/SmartImage.tsx`

**Modificados:**  
`apps/web/src/app/login/page.tsx`, `apps/web/src/lib/media-url.ts`, `apps/web/next.config.ts`, `apps/web/src/app/api/media/proxy/route.ts`, `apps/web/src/app/page.tsx`, `apps/web/src/components/layout/LayoutWithNav.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/dashboard/layout.tsx`, `apps/web/src/components/dashboard/DashboardHead.tsx`, `apps/web/src/components/dashboard/header.tsx`, `apps/web/src/components/dashboard/sidebar.tsx`, `apps/web/src/components/home/HeroCarousel.tsx`, `apps/web/src/components/home/GlobalPresenceSection.tsx`, `apps/web/src/components/portfolio/FixtureTeamLogo.tsx`, `apps/web/src/components/portfolio/modules/BlockRenderer.tsx`, `apps/web/src/components/portfolio/modules/SectionBlockRenderer.tsx`, `apps/web/src/components/portfolio/modules/ProximosJogosSection.tsx`, `apps/web/src/components/portfolio/modules/PatrocinadoresSection.tsx`, `apps/web/src/components/portfolio/modules/LogoCarouselSection.tsx`, `apps/web/src/components/portfolio/modules/TimesCategoriasSection.tsx`, `apps/web/src/components/portfolio/modules/NoticiasSection.tsx`, `apps/web/src/components/portfolio/modules/GaleriaSection.tsx`, `apps/web/src/app/portfolio/[slug]/page.tsx`

**Removidos (durante o dia):**  
`apps/web/src/app/api/auth/login/route.ts`, `apps/web/src/app/media/proxy/route.ts` (rota Next de proxy de mídia)

---

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Últimos commits do dia:** `dfdff85`, `cf65357`, `905856a`, `e26b83e`, `394bd15`, `0fbf804`, `51d72ce`, `e3bac20`, `0cf8d1f`, `40df9a3`, entre outros.
- **Branch:** `develop`
- **Push:** ✅ para repositório externo (origin) ao longo do dia.

---

# <span style="color: red; font-size: 28px;">📅 2 DE FEVEREIRO DE 2026 — ENCERRAMENTO (Últimos Resultados: nosso clube, card, marquee)</span>

## **MÓDULO ÚLTIMOS RESULTADOS: NOME/LOGO DO CLUBE PELO SLUG, CARD E MARQUEE CONDICIONAL**

### 🎯 **O QUE FOI FEITO HOJE:**

#### 1. **Nosso clube (nome e logo) pelo slug**

- **API:** `GET /public/tenants/:slug` no Nest (public.controller + public.service) retorna `{ id, name, slug, logoUrl }`. Rota Next.js `GET /api/public/tenants/[slug]` faz proxy para o backend.
- **Página portfolio:** se `page.tenant` não vier na resposta, chama `getTenantBySlug(slug)` e preenche para o BlockRenderer.
- **Cliente:** `UltimosResultadosSection` e `ProximosJogosSection` buscam `/api/public/tenants/${slug}` ao montar e usam `tenantBySlug` como fonte principal de nome/logo (`displayOurTeamName`, `displayOurTeamLogoUrl`). Fallback de nome: slug formatado (ex.: "Americano Fc") quando a API do tenant ainda não respondeu.

#### 2. **FixtureTeamLogo e placeholders “Nosso clube”**

- Nomes como "Nosso clube", "Nosso", "Our club", "Our team" passam a ser tratados como nosso time em `FixtureTeamLogo.tsx` (`isPlaceholderOurTeam`), para exibir sempre o nome e o logo do tenant quando a API devolver esses placeholders.

#### 3. **Card Últimos Resultados: layout e tamanho**

- Logo sempre à **esquerda** do nome nos dois times (casa e visitante).
- Nome em **uma linha** (`whitespace-nowrap` + `truncate`/`text-ellipsis`); tooltip com nome completo.
- Largura do card: 340px (mobile) e 400px (desktop) para caber melhor o nome; padding e placar compactos.
- Correção de build: uso de `??` com `||` em parênteses na linha do `displayOurTeamName` para evitar erro de parsing.

#### 4. **Marquee só com mais de 3 jogos**

- **Mais de 3 jogos:** carrossel em marquee contínuo (animação CSS `proximos-jogos-marquee`, 3 cópias dos cards); hover pausa a animação; sem setas.
- **3 jogos ou menos:** exibição parada, sem marquee; setas de anterior/próximo para scroll manual quando houver mais de um jogo.

---

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**Criados:**  
`apps/web/src/app/api/public/tenants/[slug]/route.ts`

**Modificados:**  
`apps/api/src/public/public.controller.ts`, `apps/api/src/public/public.service.ts`, `apps/web/src/app/portfolio/[slug]/page.tsx`, `apps/web/src/components/portfolio/FixtureTeamLogo.tsx`, `apps/web/src/components/portfolio/modules/UltimosResultadosSection.tsx`, `apps/web/src/components/portfolio/modules/ProximosJogosSection.tsx`, `docs/DESENVOLVIMENTO_DIARIO.md`

---

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Commit:** _(a ser preenchido ao commitar)_
- **Mensagem sugerida:** `feat: Últimos Resultados — nosso clube por slug, card e marquee >3 jogos; resumo 02/02`
- **Branch:** `develop`
- **Push:** após o commit, dar push para o repositório externo (origin) se desejar.

---

# <span style="color: red; font-size: 28px;">📅 16 DE FEVEREIRO DE 2026 — ENCERRAMENTO (Times por Categorias / Google Sheets / Posições)</span>

## **MÓDULO TIMES POR CATEGORIAS: GOOGLE SHEETS, POSIÇÕES COMPLETAS, PÉ DOMINANTE, SALVAR POSIÇÃO**

### 🎯 **O QUE FOI FEITO HOJE:**

#### 1. **Integração Google Sheets — Times por Categorias**

- API `GET /api/google-sheets/times-categorias`: importa CSV da planilha (por URL ou ID; suporta link "Publicado na Web" com `/d/e/2PACX-.../pub?output=csv`). Extrai `gid` da URL quando presente; mensagens de erro claras (403, 404, HTML).
- Dashboard: campo URL/ID da planilha, campo Aba (gid), botão "Atualizar com Google Sheets"; pré-preenchimento de gid ao colar URL; exibição do erro da API. Dados importados salvos no config do bloco ao clicar Salvar.
- Template CSV `public/templates/times-categorias-template.csv` com todas as colunas, incluindo `pe_dominante`.

#### 2. **Posições com nomes completos e sem corte**

- Lib `football-positions.ts`: nomes completos (Zagueiro Central, Meio-Campista); aliases (MEI, Meia → Meio-Campista; VOL, ATA, etc.). `getPositionLabel()` para exibição.
- `TimesCategoriasSection.tsx`: usa `getPositionLabel()` no card e no modal; card com `min-h`, `break-words`, `line-clamp-2` para posição não cortar.

#### 3. **Pé dominante na planilha e no salvamento**

- API: colunas `pe_dominante`, `preferred_foot`, `pe` mapeadas para `preferredFoot` (Esquerdo/Direito/Ambos normalizados).
- Template CSV e texto de ajuda no dashboard atualizados. Campo "Pé predominante" no formulário do jogador continua disponível para edição manual.

#### 4. **Salvar posição no dashboard**

- Correção de atualização imutável: `updateCategoryPlayers` e `updatePlayerField` passaram a criar novos objetos/arrays em vez de mutar, para a posição (e demais campos) persistirem ao salvar a página.

#### 5. **Guia da planilha e regra "Encerre o dia"**

- `docs/PLANILHA_TIMES_CATEGORIAS_GOOGLE_SHEETS.md`: como usar dropdowns (Validação de dados), congelar linha, listas para categoria/posição/pe_dominante.
- `docs/REGRAS_DIARIAS.md`: nova seção **Encerrar o dia** — quando o usuário escrever "encerre o dia", commitar tudo, atualizar resumo em `DESENVOLVIMENTO_DIARIO.md` e dar push para o Git externo.

---

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**Criados:**  
`apps/web/src/app/api/google-sheets/times-categorias/route.ts`, `apps/web/public/templates/times-categorias-template.csv`, `docs/PLANILHA_TIMES_CATEGORIAS_GOOGLE_SHEETS.md`

**Modificados:**  
`apps/web/src/app/dashboard/paginas/tenant/[tenantId]/editar/page.tsx`, `apps/web/src/components/portfolio/modules/TimesCategoriasSection.tsx`, `apps/web/src/lib/football-positions.ts`, `docs/REGRAS_DIARIAS.md`, `docs/DESENVOLVIMENTO_DIARIO.md`

---

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Commit:** `837fa98`
- **Mensagem:** `feat: Times por Categorias Google Sheets, posições completas, pé dominante, salvar posição; regra encerre o dia; resumo 16/02`
- **Branch:** `develop`
- **Push:** ✅ para repositório externo (origin)

---

# <span style="color: red; font-size: 28px;">📅 12 DE FEVEREIRO DE 2026 — ENCERRAMENTO</span>

## **MÓDULO PATROCINADORES, PASTA MÍDIA, SIDEBAR SENHAS**

### 🎯 **O QUE FOI FEITO HOJE:**

#### 1. **Módulo Patrocinadores (páginas por tenant)**

- Seção de patrocinadores na página pública: grid responsivo, logos em grayscale com efeito colorido no hover; título e subtítulo (PT/EN); fundo e padding configuráveis.
- Tipos e config em `home-content` (`PatrocinadorItem`, `patrocinadoresManualItems`, `patrocinadoresPaddingTop/Bottom`); `createBlock("patrocinadores")` e `BlockRenderer` passaram a renderizar o bloco.
- **Editor no dashboard:** bloco "Patrocinadores" na edição de página com lista de itens (logo via MediaPicker, nome, link opcional), botão "Adicionar patrocinador", controles de espaço no topo/embaixo.
- **Arquivos:** `apps/web/src/types/home-content.ts`, `apps/web/src/lib/home-content.ts`, `apps/web/src/components/portfolio/modules/PatrocinadoresSection.tsx`, `apps/web/src/components/portfolio/modules/BlockRenderer.tsx`, `apps/web/src/app/dashboard/paginas/tenant/[tenantId]/editar/page.tsx`

#### 2. **Pasta Mídia "Patrocinadores" e upload de logos**

- Pasta **Patrocinadores (logos)** já existia em `media-placeholders` (400×400). Editor de patrocinadores passou a usar `sizeKey="patrocinadores"` e `uploadFolderHint="patrocinadores"`; adicionado `allowAllFolders` para poder escolher logo de qualquer pasta.
- Texto na página Mídia explicando o uso da pasta "Patrocinadores (logos)" para logos de patrocinadores.
- **Arquivos:** `apps/web/src/lib/media-placeholders.ts`, `apps/web/src/app/dashboard/paginas/tenant/[tenantId]/editar/page.tsx`, `apps/web/src/app/dashboard/midia/page.tsx`

#### 3. **Sidebar — Senhas fora de Cadastros**

- Item **Senhas** removido de dentro do submenu "Cadastros" e colocado no menu principal, **acima de Páginas** (ordem: Dashboard, Grupo Master, Emails, **Senhas**, Páginas, Notícias, Mídia, Configurações). Destaque ativo e abertura do Cadastros ajustados para não depender da rota `/dashboard/senhas`.
- **Arquivos:** `apps/web/src/components/dashboard/sidebar.tsx`

---

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**Criados:**  
`apps/web/src/components/portfolio/modules/PatrocinadoresSection.tsx`

**Modificados:**  
`apps/web/src/types/home-content.ts`, `apps/web/src/lib/home-content.ts`, `apps/web/src/components/portfolio/modules/BlockRenderer.tsx`, `apps/web/src/app/dashboard/paginas/tenant/[tenantId]/editar/page.tsx`, `apps/web/src/app/dashboard/midia/page.tsx`, `apps/web/src/components/dashboard/sidebar.tsx`

*Nota: O commit inclui também demais alterações pendentes no repositório (mídia, auth, portfolio, etc.).*

---

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Commit:** `03383c8`
- **Mensagem:** `feat: módulo Patrocinadores (editor + seção), pasta mídia patrocinadores, Sidebar Senhas fora de Cadastros; resumo do dia 12/02`
- **Branch:** `develop`
- **Push:** ✅ para repositório externo (origin)

---

# <span style="color: red; font-size: 28px;">📅 11 DE FEVEREIRO DE 2026 — ENCERRAMENTO</span>

## **CORREÇÃO DO CORTE DO CONTEÚDO À DIREITA NO DASHBOARD**

### 🎯 **O QUE FOI FEITO HOJE:**

#### 1. **Dashboard cortando conteúdo à direita (cards, Atalhos, Resumo por tipo, Avisos)**

- **Problema:** O lado direito da página do dashboard estava sendo cortado — cards de estatísticas, painel Atalhos, Resumo por tipo e Avisos ficavam parcialmente ocultos ou sobrepostos pela barra de rolagem.
- **Causa:** Scroll do `body` vs. scroll na área de conteúdo; barra de rolagem sobrepondo o conteúdo.
- **Solução:**
  - **DashboardBodyLock:** componente que adiciona `dashboard-active` ao `body` quando o dashboard está ativo; com `overflow: hidden` e `height: 100vh` no body, o scroll fica **apenas** na área de conteúdo.
  - **scrollbar-gutter: stable** + **overflow-y: scroll** na área de conteúdo — reserva espaço para a scrollbar e evita que o conteúdo seja cortado.
  - **CSS global:** `overflow-x: clip` em `html` e `body`; `margin: 0`; `width: 100%` e `max-width: 100%`.
  - **Layout:** `flex-[1_1_0%]` no container principal; `overflow-clip` na hierarquia; padding direito (`pr-6`) no conteúdo; wrapper com `min-w-0 max-w-full`.
  - **Header:** `min-w-0`, `truncate` no título; `shrink-0` nos botões.
  - **Grid de stats:** breakpoints ajustados (`2xl:grid-cols-5`) para evitar colunas apertadas.
- **Arquivos:** `apps/web/src/components/dashboard/DashboardBodyLock.tsx` (novo), `apps/web/src/app/dashboard/layout.tsx`, `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/components/dashboard/header.tsx`
- **Status:** ✅ RESOLVIDO

---

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**Criados:**
`apps/web/src/components/dashboard/DashboardBodyLock.tsx`

**Modificados:**
`apps/web/src/app/dashboard/layout.tsx`, `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/components/dashboard/header.tsx`

*Nota: O commit inclui também alterações de outras sessões (módulos portfolio, notícias, etc.) conforme o status do repositório.*

---

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Commit:** `7bd120b`
- **Mensagem:** `fix: dashboard — evita corte do conteúdo à direita; módulos portfolio, notícias, SectionTitle`
- **Branch:** `develop`
- **Push:** ✅ para repositório externo (origin)

---

# <span style="color: red; font-size: 28px;">📅 2 DE FEVEREIRO DE 2026 — ENCERRAMENTO</span>

## **PRÓXIMOS JOGOS: CARROSSEL, CONFIG PADRÃO, DETAILS POR JOGO, LOGOS SOFASCORE**

### 🎯 **O QUE FOI FEITO HOJE:**

#### 1. **Carrossel “slide passando e parando” (Próximos Jogos)**

- Seção pública de Próximos Jogos passou a exibir os jogos em **carrossel horizontal** com scroll-snap.
- Cada jogo em card com: competição, data/hora, data em destaque (ex.: 14 SÁB), times com logos, botão Comprar ingresso/Assistir, local.
- Setas anterior/próximo; auto-avanço a cada 5s (pausa ao passar o mouse).
- Filtro por data (Todos + datas específicas) mantido.
- **Arquivo:** `apps/web/src/components/portfolio/modules/ProximosJogosSection.tsx`

#### 2. **Configurações padrão de fundo/cor para o módulo Próximos Jogos**

- O módulo **Próximos jogos** passou a ter as mesmas opções de aparência dos outros: **cor de fundo (hex)**, **opacidade do overlay**, **imagem de fundo** e **tamanho do módulo** (compacto/normal/grande).
- **Arquivo:** `apps/web/src/app/dashboard/paginas/tenant/[tenantId]/editar/page.tsx`

#### 3. **Cada jogo como `<details>` no editor (lista manual)**

- Na lista manual de jogos, cada jogo virou um **`<details>`** com resumo (ex.: "Jogo 1: Casa x Visitante — 14/02 18:00") e conteúdo expandível com todos os campos.
- O último jogo da lista fica aberto por padrão; os demais fechados para não poluir quando há muitos jogos.
- **Arquivo:** `apps/web/src/app/dashboard/paginas/tenant/[tenantId]/editar/page.tsx`

#### 4. **Logos no modo automático (SofaScore)**

- Backend passou a tentar incluir **logos dos times e da competição** quando a fonte é SofaScore.
- Uso de campos da API (ex.: `homeTeam.image`, `homeTeam.logo`, `tournament.image`) ou montagem de URL por id (`/team/{id}/image`, `/unique-tournament/{id}/image`).
- **isOurTeamHome** derivado no backend (comparando `homeTeam.id` com o teamId da requisição) e repassado ao front.
- **Arquivos:** `apps/api/src/public/sofascore.service.ts`, `apps/api/src/public/public.service.ts`

---

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**API:** `apps/api/src/public/sofascore.service.ts`, `apps/api/src/public/public.service.ts`, `apps/api/src/public/dto/fixture.dto.ts`, e demais já modificados (migrations, tenants, media, vault, etc.).

**Web:** `apps/web/src/components/portfolio/modules/ProximosJogosSection.tsx`, `apps/web/src/app/dashboard/paginas/tenant/[tenantId]/editar/page.tsx`, `apps/web/src/app/api/public/tenants/[slug]/fixtures/route.ts`, e demais (context, sidebar, portfolio, etc.).

---

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Commit:** `d2d1adb`
- **Mensagem:** `feat: Próximos Jogos carrossel, config padrão, details por jogo, logos SofaScore; vault; resumo do dia`
- **Branch:** `develop`
- **Push:** ✅ para repositório externo (origin)

---

# <span style="color: red; font-size: 28px;">📅 10 DE FEVEREIRO DE 2026</span>

## **PRESENÇA GLOBAL DINÂMICA, AJUSTES NO BUILDER E FECHAMENTO DO CICLO**

### 🎯 **PROBLEMAS RESOLVIDOS HOJE:**

#### 1. **Contadores da Presença Global sem “Empresas” e com valores antigos**

- **Problema:** O card de **Empresas** não aparecia em alguns cenários e os números de Clubes/Empresas podiam refletir conteúdo salvo antigo.
- **Causa:** O enriquecimento atualizava apenas contadores já existentes no JSON; quando `companies` não existia, não era criado.
- **Solução:** Backend passou a garantir os **5 contadores padrão** (`clubs`, `companies`, `athletes`, `projects`, `countries`) no enriquecimento, atualizando automaticamente os valores de clubes/empresas/países a partir do cadastro.
- **Arquivos:** `apps/api/src/home-content/home-content.service.ts`
- **Status:** ✅ RESOLVIDO

#### 2. **Dados divergentes entre editor/dashboard e home pública**

- **Problema:** Dashboard e home pública podiam mostrar dados diferentes no bloco Global Presence.
- **Causa:** Fluxos distintos: parte carregava conteúdo bruto sem enriquecimento.
- **Solução:** Reuso da lógica de enriquecimento para:
  - `GET /home-content` (dashboard) retornar conteúdo enriquecido;
  - `GET /public/group-home` (home pública e editor de group-home) retornar blocos enriquecidos.
- **Arquivos:** `apps/api/src/home-content/home-content.controller.ts`, `apps/api/src/group/group.service.ts`, `apps/api/src/group/group.module.ts`
- **Status:** ✅ RESOLVIDO

#### 3. **Edição manual de “Localizações (mapa)” gerando redundância**

- **Problema:** O editor permitia manter lista manual de localizações, mas a regra passou a ser “mapa vem do cadastro”.
- **Solução:** Removida a seção manual **“Localizações (mapa)”** dos editores de página (grupo e tenant).
- **Arquivos:** `apps/web/src/app/dashboard/paginas/group-home/editar/page.tsx`, `apps/web/src/app/dashboard/paginas/tenant/[tenantId]/editar/page.tsx`
- **Status:** ✅ RESOLVIDO

---

### 🛠️ **MELHORIAS IMPLEMENTADAS:**

#### 1. **Mapa Leaflet e experiência do bloco Presença Global**

- Componente dedicado de mapa (`GlobalPresenceLeafletMap`) com hover/popup e tema dark.
- Lista “Presença por país” com contagem por país.
- Ajuste visual de altura/proporção do mapa para melhor alinhamento com os cards de contadores.
- **Arquivos:** `apps/web/src/components/home/GlobalPresenceLeafletMap.tsx`, `apps/web/src/components/home/GlobalPresenceSection.tsx`, `apps/web/src/app/globals.css`

#### 2. **Cadastro de empresas/clubes para alimentar o mapa**

- Inclusão de campos de presença global no cadastro: `lat`, `lng`, `city`, `country`, `websiteUrl`.
- Remoção do campo **Localização** do formulário (fonte única passa a ser os campos estruturados).
- Campo de URL aceitando valor sem exigir `http://` (normalização no submit).
- **Arquivos:** `apps/web/src/app/dashboard/empresas/new/page.tsx`, `apps/web/src/app/dashboard/empresas/[id]/edit/page.tsx`, `apps/api/src/tenants/dto/*`, `apps/api/src/tenants/tenants.service.ts`, `apps/web/src/types/tenant.ts`

#### 3. **Builder/Home com expansão estrutural**

- Evoluções no editor da home (group-home e tenant), presets e refinamentos de blocos.
- Novos utilitários de suporte (`cta-presets`, `authFetch`) e componentes auxiliares (`FounderBioExpandable`).
- **Arquivos:** `apps/web/src/app/dashboard/paginas/group-home/editar/page.tsx`, `apps/web/src/app/dashboard/paginas/tenant/[tenantId]/editar/page.tsx`, `apps/web/src/lib/cta-presets.ts`, `apps/web/src/lib/authFetch.ts`, `apps/web/src/components/founder/FounderBioExpandable.tsx`

---

### 📁 **ARQUIVOS CRIADOS/MODIFICADOS (10/02):**

**Criados (destaques):**
`apps/web/src/components/home/GlobalPresenceLeafletMap.tsx`
`apps/web/src/components/home/GlobalPresenceSection.tsx`
`apps/web/src/components/founder/FounderBioExpandable.tsx`
`apps/web/src/lib/authFetch.ts`
`apps/web/src/lib/cta-presets.ts`
`apps/web/public/maps/world-fifa.svg`
`apps/web/scripts/generate-world-svg.cjs`
`apps/api/src/media/media-meta.service.ts`
`apps/api/prisma/migrations/20260205000000_add_media_meta/migration.sql`
`apps/api/prisma/migrations/20260206000000_add_tenant_global_presence_fields/migration.sql`

**Modificados (destaques):**
`apps/api/src/home-content/home-content.service.ts`, `apps/api/src/home-content/home-content.controller.ts`, `apps/api/src/group/group.service.ts`, `apps/api/src/group/group.module.ts`, `apps/api/src/tenants/*`, `apps/web/src/app/page.tsx`, `apps/web/src/app/dashboard/conteudo/page.tsx`, `apps/web/src/app/dashboard/empresas/*`, `apps/web/src/app/dashboard/paginas/group-home/editar/page.tsx`, `apps/web/src/app/dashboard/paginas/tenant/[tenantId]/editar/page.tsx`, `apps/web/src/lib/home-content.ts`, `apps/web/src/types/home-content.ts`, `apps/web/src/app/globals.css`.

---

### 📊 **STATUS ATUAL DO SISTEMA:**

**✅ Funcionando:**
Global Presence com mapa e contadores dinâmicos; card de Empresas garantido; Clubes/Empresas/Países vindos do cadastro; Atletas/Projetos manuais; edição de páginas (grupo/tenant) sem localizações manuais redundantes.

**⏳ Pendente:**
Refino fino de layout/UX pós-validação em produção e testes E2E completos.

---

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Commit:** `2aaff41`
- **Mensagem:** `feat: consolidate home builder updates and dynamic global presence`
- **Branch:** `develop`
- **Push:** ✅ `origin/develop` atualizado

---

# <span style="color: red; font-size: 28px;">📅 2 DE FEVEREIRO DE 2026</span>

## **CONTEÚDO MODULAR DA HOME, LOGO/FAVICON, ENDEREÇO/CONTATO, REFRESH JWT**

### 🎯 **PROBLEMAS RESOLVIDOS HOJE:**

#### 1. **Token JWT expirado — 401 toda hora**

- **Problema:** Após ~1h o dashboard passava a retornar 401 (Invalid token / jwt expired).
- **Causa:** Cognito emite JWT com expiração curta; o front não renovava o token.
- **Solução:** Rota `POST /api/auth/refresh` que usa o cookie `refresh_token` para obter novos `id_token` e `access_token` no Cognito; no AuthContext, quando `/api/me` retorna 401, chama refresh e refaz a requisição; scope de login alterado para `openid offline_access` para o Cognito devolver refresh_token.
- **Arquivos:** `apps/web/src/app/api/auth/refresh/route.ts` (novo), `apps/web/src/context/AuthContext.tsx`, `apps/web/src/lib/cognito-hosted-ui.ts`
- **Status:** ✅ RESOLVIDO

#### 2. **Prisma Client sem campos novos após migração**

- **Problema:** Erros TS2339 (address, contactName, contactPhone não existem no tipo) após adicionar colunas ao schema.
- **Causa:** Migração aplicada mas Prisma Client não regenerado.
- **Solução:** `npx prisma generate` para regenerar o client com os novos campos.
- **Status:** ✅ RESOLVIDO

---

### 🛠️ **MELHORIAS IMPLEMENTADAS:**

#### 1. **Conteúdo da home modular (blocos)**

- Módulos da página com ordem editável (subir/descer), títulos PT/EN por bloco, cor de fundo (hex), imagem de fundo e opacidade do overlay para qualquer seção.
- Novos blocos: "Bloco de texto" (título + corpo) e "Módulo customizado" (título + corpo + imagem).
- Home pública renderiza por lista de blocos; suporte a blocos "text" e "custom".
- **Arquivos:** `apps/web/src/types/home-content.ts`, `apps/web/src/lib/home-content.ts`, `apps/web/src/app/page.tsx`, `apps/web/src/app/dashboard/conteudo/page.tsx`; backend já aceitava JSON com `blocks`.

#### 2. **Logo e favicon do Grupo Master**

- Nome e logo vêm da API do Grupo (GET /group) em todo o site: home (header + rodapé + título da aba), login/403, dashboard (sidebar e header), metadata do layout (title, description, favicon).
- **Arquivos:** `apps/web/src/app/page.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/src/components/layout/LayoutWithNav.tsx`

#### 3. **Dashboard — "Dashboard" antes do nome da empresa**

- Sidebar e header do dashboard exibem "Dashboard" antes do nome do grupo para não confundir com o site público.
- **Arquivos:** `apps/web/src/components/dashboard/sidebar.tsx`, `apps/web/src/components/dashboard/header.tsx`

#### 4. **Endereço e contato (Grupo Master e Empresas)**

- Schema: Group e Tenant com `address`, `contactName`, `contactPhone`.
- API: DTOs e services (Group e Tenants) atualizados; portfólio público retorna address, contactName, contactPhone.
- Dashboard: formulários Grupo Master e Empresas (nova/editar) com campos Endereço, Nome do contato, Telefone do contato (e Localização para empresas).
- Home: cards do portfólio exibem endereço, nome do contato e telefone quando preenchidos.
- **Arquivos:** `apps/api/prisma/schema.prisma`, `apps/api/src/group/*`, `apps/api/src/tenants/*`, `apps/api/src/public/public.service.ts`, `apps/web/src/types/group.ts`, `apps/web/src/types/tenant.ts`, `apps/web/src/app/dashboard/grupo/page.tsx`, `apps/web/src/app/dashboard/empresas/new/page.tsx`, `apps/web/src/app/dashboard/empresas/[id]/edit/page.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/lib/public-portfolio.ts`

#### 5. **Migração e banco**

- Migração `add-address-contact-group-tenant` para colunas em Group e Tenant.
- Docker: `docker-compose up -d db` para subir PostgreSQL quando necessário.

#### 6. **Cores do cabeçalho e rodapé (blocos header/footer)**

- Home e portfólio passam a usar `backgroundColor`, `headerTextColor` e `footerTextColor` dos blocos header/footer para estilizar a barra fixa do topo e o rodapé.
- Editor: card do cabeçalho com fundo/borda em azul (sky), rodapé em verde (emerald) para identificar onde é cab e rodapé; no header/rodapé escondidos "Imagem de fundo" e "Opacidade overlay"; adicionado "Cor do texto" (hex) no cabeçalho.
- Dropdown "Adicionar módulo (entre cabeçalho e rodapé)" posicionado **antes** do card do rodapé, deixando claro que os módulos entram no meio.
- **Arquivos:** `apps/web/src/app/page.tsx`, `apps/web/src/app/portfolio/[slug]/page.tsx`, `apps/web/src/app/dashboard/paginas/tenant/[tenantId]/editar/page.tsx`

#### 7. **Favicon do portfólio nunca sumir ao dar refresh**

- **Problema:** Favicon (logo do tenant) sumia ao atualizar a página.
- **Causa:** Layout raiz definia `icons: "/favicon.ico"` e podia sobrescrever o favicon do portfólio.
- **Solução:** Removido `icons` do `generateMetadata` do layout raiz; criado `apps/web/src/app/portfolio/[slug]/layout.tsx` que define o favicon no segmento (sempre logo do tenant). Assim o favicon do portfólio nunca é sobrescrito.
- **Arquivos:** `apps/web/src/app/layout.tsx`, `apps/web/src/app/portfolio/[slug]/layout.tsx` (novo)
- **Status:** ✅ RESOLVIDO

---

### 📁 **ARQUIVOS CRIADOS/MODIFICADOS (02/02):**

**Criados:**
`apps/web/src/app/api/auth/refresh/route.ts`
`apps/web/src/app/portfolio/[slug]/layout.tsx`

**Modificados:**
Schema e API (group, tenants, public); tipos e libs do front (home-content, group, tenant, public-portfolio); páginas home, dashboard/conteudo, dashboard/grupo, empresas new/edit; AuthContext e cognito-hosted-ui; sidebar e header do dashboard; layout e LayoutWithNav; page.tsx (home e portfolio) para cores header/footer; editar página tenant (editor cab/rodapé e "Adicionar módulo" antes do rodapé); layout raiz (removido icons).

---

### 📊 **STATUS ATUAL DO SISTEMA:**

**✅ Funcionando:**
Conteúdo modular da home (blocos, aparência, custom/text); logo e favicon do Grupo; endereço e contato no Grupo e nas Empresas (dashboard e portfólio); renovação de token (refresh) ao receber 401; Prisma Client alinhado ao schema.

**⏳ Pendente:**
Deploy; testes E2E; ajustes de UX conforme uso.

---

### 📝 **PRÓXIMAS AÇÕES:**

- [ ] Fazer novo login após deploy do scope `offline_access` para obter refresh_token
- [ ] Deploy (Vercel + API)
- [ ] Revisar exibição de endereço/contato no portfólio (layout/UX)

---

# <span style="color: red; font-size: 28px;">📅 27 DE JANEIRO DE 2026</span>

## **BOOTSTRAP DO PROJETO + BASE MULTI-TENANT**

### 🎯 **PROBLEMAS RESOLVIDOS HOJE:**

#### 1. **Estruturação do Monorepo**

- **Problema:** Projeto sem organização clara para escalar frontend e backend.
- **Causa:** Início sem definição de arquitetura.
- **Solução:** Criação de monorepo com pnpm workspaces (`apps/web`, `apps/api`, `docs`).
- **Arquivos:** `package.json`, `pnpm-workspace.yaml`
- **Status:** ✅ RESOLVIDO

#### 2. **Configuração do Banco e Prisma**

- **Problema:** Prisma 7 alterou a forma de definir `DATABASE_URL`.
- **Causa:** Breaking change no Prisma CLI.
- **Solução:** Uso de `prisma.config.ts` com fallback local e migrations aplicadas.
- **Arquivos:** `apps/api/prisma.config.ts`, `apps/api/prisma/schema.prisma`
- **Status:** ✅ RESOLVIDO

#### 3. **Definição Correta de Tenant**

- **Problema:** Dúvida conceitual entre Tenant e Empresa.
- **Causa:** Termo técnico exposto no UI.
- **Solução:** Definição oficial: Tenant = Empresa do Grupo (apenas técnico).
- **Arquivos:** `docs/REGRAS_DIARIAS.md`
- **Status:** ✅ RESOLVIDO

---

### 🛠️ **MELHORIAS IMPLEMENTADAS:**

#### 1. **Dashboard Base em Dark Mode**

- Criação do shell inicial do dashboard
- Definição de identidade visual corporativa
- Preparação para multi-tenant
- **Status:** ✅ CONCLUÍDO

---

### 📁 **ARQUIVOS CRIADOS/MODIFICADOS HOJE:**

#### **Criados:**

1. `docs/REGRAS_DIARIAS.md` — Regras oficiais do projeto
2. `apps/api/prisma.config.ts` — Configuração Prisma 7
3. `apps/api/prisma/schema.prisma` — Modelo Tenant
4. Estrutura base do monorepo

#### **Modificados:**

1. Configurações iniciais do Next.js
2. Configurações iniciais do NestJS

---

### 📊 **STATUS ATUAL DO SISTEMA:**

#### ✅ **FUNCIONANDO:**

- Monorepo pnpm
- Next.js (apps/web)
- NestJS (apps/api)
- PostgreSQL via Docker
- Prisma migrate + Prisma Studio

#### ⏳ **PENDENTE:**

- Conexão UI ↔ API (tenants no dashboard)
- Autenticação (AWS Cognito)
- Seleção de Empresa (Tenant Switch)

---

### 🎯 **LIÇÕES APRENDIDAS:**

1. Definir conceitos (Tenant vs Empresa) cedo evita refatorações grandes.
2. Prisma 7 exige atenção especial à configuração de datasource.
3. Avançar por passos controlados reduz erros acumulados.

---

### 📝 **PRÓXIMAS AÇÕES:**

- [ ] Finalizar CRUD de Empresas no Dashboard
- [ ] Ajustar UX (labels e navegação)
- [ ] Implementar Auth (Cognito)
- [ ] Implementar Tenant Switch

---

### 🎉 **CONQUISTAS DO DIA:**

1. Base técnica sólida criada.
2. Arquitetura pronta para escalar multi-empresas.
3. Fluxo de trabalho com Cursor definido.

---

# <span style="color: red; font-size: 28px;">📅 30 DE JANEIRO DE 2026</span>

## **CRUD DE EMPRESAS, PRISMA 7, API TENANTS COMPLETO**

### 🎯 **PROBLEMAS RESOLVIDOS HOJE:**

#### 1. **Prisma 7 — URL do datasource**

- **Problema:** `P1012` — `url` no schema não é mais suportado.
- **Solução:** Remoção de `url` do `schema.prisma`; URL apenas em `prisma.config.ts`; `import 'dotenv/config'` para carregar `.env` no CLI.
- **Arquivos:** `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`, `apps/api/package.json` (dotenv)
- **Status:** ✅ RESOLVIDO

#### 2. **API 500 em GET /tenants — coluna inexistente**

- **Problema:** "The column `(not available)` does not exist" e depois "column kind does not exist".
- **Causa:** Banco com tabela `Tenant` usando **`kindId`** (FK para TenantKind), não `kind` (string); client Prisma gerado com schema desatualizado.
- **Solução:** Schema alinhado: `Tenant.kindId` + relação `TenantKind`; `findAll()` e `findOne()` via **`$queryRaw`** com JOIN em TenantKind; `create`/`update`/`remove` via raw SQL; migration TenantKind marcada como aplicada quando tabela já existia (`prisma migrate resolve --applied`).
- **Arquivos:** `apps/api/prisma/schema.prisma`, `apps/api/src/tenants/tenants.service.ts`
- **Status:** ✅ RESOLVIDO

#### 3. **API sem DATABASE_URL ao subir**

- **Problema:** "DATABASE_URL environment variable is not set" ao iniciar a API.
- **Solução:** `import 'dotenv/config'` em `main.ts`; fallback de URL no `PrismaService` (postgres local bcg/bcg_password).
- **Arquivos:** `apps/api/src/main.ts`, `apps/api/src/prisma/prisma.service.ts`
- **Status:** ✅ RESOLVIDO

#### 4. **CRUD de Empresas ausente no dashboard**

- **Problema:** Página "Nova Empresa" era placeholder; sem editar/excluir; lista sem coluna Ações.
- **Solução:** API: `GET /tenants/:id`, `POST /tenants`, `PATCH /tenants/:id`, `DELETE /tenants/:id`; DTOs Create/Update; TenantsService findOne, create, update, remove (raw); Web: formulário Nova Empresa (nome, slug, tipo), páginas Editar e Excluir empresa, coluna Ações (Editar/Excluir) na lista; mensagem de sucesso com `?success=true`.
- **Arquivos:** API: `tenants.controller.ts`, `tenants.service.ts`, `dto/update-tenant.dto.ts`; Web: `empresas/new/page.tsx`, `empresas/[id]/edit/page.tsx`, `empresas/[id]/delete/page.tsx`, `empresas/page.tsx`
- **Status:** ✅ RESOLVIDO

#### 5. **Tipos (editar/excluir) — dados não carregavam**

- **Problema:** `api.get` retorna `{ data: T }`; páginas usavam o objeto inteiro.
- **Solução:** Uso de `const { data } = await api.get<TenantKind>(...)` em tipos edit e delete; API: `GET /tenant-kinds/:id` adicionado.
- **Arquivos:** `apps/api/src/tenant-kinds/tenant-kinds.controller.ts`, `apps/web/.../tipos/[id]/edit/page.tsx`, `.../delete/page.tsx`
- **Status:** ✅ RESOLVIDO

---

### 🛠️ **MELHORIAS IMPLEMENTADAS:**

- **API:** CORS habilitado; `AllExceptionsFilter` (log + mensagem real no 500); `ValidationPipe` global; endpoint `GET /tenants/debug` para diagnóstico; README da API com instruções para subir e usar empresas/tipos.
- **Web:** Slug gerado automaticamente a partir do nome (Nova/Editar empresa); select de Tipo de Empresa carregado de `/tenant-kinds`.
- **Git:** `.gitignore` com `_tmp*` (IDE temp).

---

### 📁 **ARQUIVOS CRIADOS/MODIFICADOS (30/01):**

**Criados:**
`apps/api/src/tenants/dto/update-tenant.dto.ts`, `apps/api/src/common/http-exception.filter.ts`, `apps/web/src/app/dashboard/empresas/[id]/edit/page.tsx`, `apps/web/src/app/dashboard/empresas/[id]/delete/page.tsx`

**Modificados:**
`apps/api`: main.ts, prisma.service.ts, tenants.controller.ts, tenants.service.ts, tenant-kinds.controller.ts, tenant-kinds.service.ts, prisma/schema.prisma, prisma.config.ts, package.json, README.md; `apps/web`: empresas/page.tsx, empresas/new/page.tsx, tipos/[id]/edit e delete; `.gitignore`

---

### 📊 **STATUS ATUAL DO SISTEMA:**

**✅ Funcionando:**
Monorepo, Next.js (dashboard), NestJS (API), PostgreSQL, Prisma 7 (config + migrate), GET/POST/PATCH/DELETE tenants, GET tenant-kinds + :id, CRUD Empresas (listar, nova, editar, excluir), CRUD Tipos (listar, novo, editar, excluir), login Cognito Hosted UI, callback e cookies.

**⏳ Pendente:**
Auth em todas as rotas protegidas, Tenant Switch, deploy.

---

### 📝 **PRÓXIMAS AÇÕES:**

- [ ] Proteger rotas do dashboard com auth
- [ ] Tenant Switch (seleção de empresa)
- [ ] Deploy (Vercel + API)
- [ ] Remover ou restringir GET /tenants/debug em produção

---

### 🎉 **CONQUISTAS DO DIA (30/01):**

1. CRUD completo de Empresas no dashboard (nova, editar, excluir).
2. API tenants alinhada ao banco (kindId + raw query).
3. Prisma 7 configurado e estável.
4. Branch `develop` criada para fluxo de trabalho.

---

### 📌 **Credenciais AWS (Cognito) — DEV local**

Para o endpoint **GET /users** (e criar/alterar usuários) funcionar, a API precisa de credenciais AWS com permissão no User Pool.

- **Opção 1 (recomendada):** Instalar AWS CLI v2, rodar `aws configure --profile bcg-dev`, e no `apps/api/.env` setar `AWS_PROFILE=bcg-dev`. Não usar `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`.
- **Opção 2:** Preencher `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` no `.env` (nunca commitar).

Se não houver credenciais, a API retorna 500 com mensagem orientando. Ver **`docs/AWS_CREDENTIALS.md`** (IAM policy mínima e comando de teste: GET /users com Bearer token).

---

### 📌 **Regra: Módulos do dashboard (resumo diário e regras)**

**Todo novo módulo do dashboard deve vir para a tela Configurações → Módulos.**
Regra registrada em **`docs/REGRAS_DIARIAS.md`** (seção Módulos do dashboard) e detalhada em **`docs/MODULOS_DASHBOARD.md`**. Ao criar um novo módulo: cadastrar em Module + ModuleRole no backend, adicionar no menu da sidebar com o mesmo `moduleSlug`, e proteger a página com `canAccessModule("slug")`.

---

# <span style="color: red; font-size: 28px;">📅 31 DE JANEIRO DE 2026</span>

## **LOGO S3, GRUPO MASTER, MÓDULOS, LOGOUT E DASHBOARD INFORMATIVO**

### 🎯 **O QUE FOI FEITO:**

#### 1. **Upload de logo (S3)**

- **Backend:** `S3Module` + `S3Service`; endpoint `POST /upload/logo` (multipart, `scope`: `'group'` ou `tenantId`); bucket configurável via `AWS_S3_BUCKET`.
- **Banco:** Campo `logoUrl` em `Tenant`; migration aplicada.
- **Frontend:** Página editar empresa com upload de logo; lista de empresas com coluna Logo; Grupo Master com upload de logo do grupo.
- **Doc:** `docs/S3_BUCKET_POLICY.md` (política S3 e Block Public Access).

#### 2. **Grupo Master (Group)**

- **Backend:** Modelo `Group` (name, slug, logoUrl, description); `GET /group` e `PATCH /group`; `GET` público para header/sidebar; `PATCH` e upload de logo do grupo restritos a `super_admin`.
- **Frontend:** Sidebar e Header exibem nome e logo do grupo; página "Grupo Master" para editar nome, descrição e logo; `DashboardHead` define título e favicon dinâmicos.

#### 3. **Permissões por módulo**

- **Backend:** Modelos `Module` e `ModuleRole`; seed de módulos (dashboard, grupo_master, usuarios, empresas, tipos, paginas, noticias, midia, configuracoes); `GET /me/modules` (módulos do usuário); `GET/PATCH /settings/modules` (super_admin).
- **Frontend:** Sidebar filtra itens por `canAccessModule(moduleSlug)`; página Configurações → Módulos (super_admin) com checkboxes por role; páginas protegidas com redirect para `/403`.
- **Doc:** `docs/MODULOS_DASHBOARD.md`.

#### 4. **Logout e URL de saída**

- **Frontend:** `getHostedUiLogoutUrl()` redireciona para `/login` após logout no Cognito.
- **Cognito:** Para evitar tela "Invalid request", adicionar `http://localhost:3000/login` (e URL de produção) em **Sign out URL(s)** do App Client (Hosted UI).
- **Doc:** `docs/TOKEN_STORAGE.md` atualizado com passos no AWS Console.

#### 5. **Criação de usuário — confirmação de senha**

- **Frontend:** Campo "Confirmar senha temporária" na página Novo Usuário; validação client-side (match e mínimo 8 caracteres) antes de enviar à API.

#### 6. **Dashboard informativo e visual**

- **Backend:** `GET /dashboard/stats` (JwtAuthGuard + DashboardRolesGuard) retorna `tenantsCount`, `tenantKindsCount`, `usersCount`.
- **Frontend:** Dashboard redesenhado: faixa de boas-vindas com nome do grupo; 4 cards de resumo (Empresas, Usuários, Tipos de empresa, Páginas) com ícones e gradientes; seção "Últimas empresas" (5 primeiras com logo e link); coluna "Atalhos" com links rápidos para as áreas do dashboard.

---

### 📁 **ARQUIVOS CRIADOS/MODIFICADOS (31/01):**

**Backend (api):**
`src/dashboard/` (controller, service, module), `src/upload/`, `src/group/`, `src/modules/`, `src/s3/`, Prisma schema (Group, Module, ModuleRole, Tenant.logoUrl), migrations; `app.module.ts` (DashboardModule).

**Frontend (web):**
Dashboard page (resumo, cards, últimas empresas, atalhos); sidebar e header (grupo/logo); página Grupo Master; Configurações e Configurações/Módulos; páginas empresas (logo, upload); login; `cognito-hosted-ui.ts` (logout_uri); `DashboardHead.tsx`; AuthContext (modules); `TOKEN_STORAGE.md`, `S3_BUCKET_POLICY.md`, `MODULOS_DASHBOARD.md`.

---

### 📊 **STATUS ATUAL:**

**✅ Funcionando:**
Monorepo, CRUD Empresas/Tipos/Usuários, Auth Cognito, Grupo Master (nome/logo), upload de logos (S3), permissões por módulo (sidebar + Configurações → Módulos), logout para nossa tela de login (com Sign out URL no Cognito), dashboard com estatísticas e atalhos.

**⏳ Pendente:**
Deploy, páginas de conteúdo (Páginas, Notícias, Mídia) com dados reais.

---

### 🎉 **CONQUISTAS DO DIA (31/01):**

1. Dashboard com resumo útil e visual mais claro.
2. Grupo Master configurável (nome e logo) com acesso controlado.
3. Controle de acesso por módulo (super_admin define quem vê o quê).
4. Logout sem tela de erro da AWS quando Sign out URL está configurada.

---
