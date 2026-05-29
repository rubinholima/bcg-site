# 📘 DESENVOLVIMENTO DIÁRIO — BCG PLATFORM

> **Este arquivo concentra TODO o histórico diário do projeto.**
> **NUNCA** criar outros arquivos de resumo.
> Atualizar **somente no FIM DO DIA**.
> **Sempre usar a data do sistema** ao criar seção de encerramento (rodar `date` no terminal para obter o dia atual).

---

# ⭐ REGRAS DIÁRIAS (LER PRIMEIRO)

> **Leia esta seção todo dia antes de desenvolver.** O resto do documento é histórico por dia e docs consolidados.

- **Nunca mudar o que já funciona** — Não modifique código/comportamento aprovado; não adicione scrollbars/overflow em áreas que funcionam; só altere o que foi pedido.
- **Carrosséis** — Usar `el.scrollTo({ left: ... })` no container. **NUNCA** `scrollIntoView` (quebra o scroll vertical da página).
- **Dashboard** — Não alterar estrutura base: Sidebar, Header, nome "BCG Platform". Layout em `apps/web/src/app/dashboard/layout.tsx`.
- **Rotina do dia** — (1) Subir banco: `docker compose up -d db`. (2) Ler regras e desenvolvimento diário. (3) Confirmar objetivo antes de codar.
- **NUNCA apagar/resetar o banco** — Proibido rodar `prisma migrate reset`. Apaga todos os dados (usuários, tenants, eventos, etc.) e é irreversível. Usar apenas `prisma migrate dev` ou `prisma migrate deploy`.
- **Passo a passo com aprovação** — Tarefas com mais de um passo (deploy, config, etc.): dar **um passo** no chat, **esperar** o usuário aprovar ("ok", "próximo", "aprovo") e **só então** dar o próximo. Não mandar lista longa de uma vez; não mandar ler arquivo em vez dos passos. Exceção: se o usuário disser "pode fazer tudo" ou "rode tudo".
- **Código** — TypeScript; tenant = empresa (conceito técnico vs UI); não quebrar monorepo.
- **Módulos de página** — Padrão: cor de fundo, overlay, títulos PT/EN; Hero com carrossel; ver seção MODULOS_PAGINA em DOCS CONSOLIDADOS (final do arquivo).
- **Módulos do dashboard** — Cadastrar em Module + ModuleRole no backend; sidebar com mesmo `moduleSlug`; proteger página com `canAccessModule("slug")`. Ver seção MODULOS_DASHBOARD em DOCS CONSOLIDADOS.
- **Encerrar o dia** — Quando o usuário disser "encerre o dia": (1) Commit de tudo. (2) No **topo** da seção "POR DIA" (logo abaixo das regras), adicionar **📅 [DATA] — ENCERRAMENTO** (data do sistema via `date`), com o que foi feito, arquivos, commit e push. (3) `git push origin <branch>`.
- **Estrutura do doc** — O topo do arquivo tem sempre: (1) Regras diárias. (2) Imediatamente após, a seção "POR DIA — ENCERRAMENTOS". Nada entre elas.
- **Git** — Trabalhar em branch; não commitar direto em main.
- **Cursor OOM** — `NODE_OPTIONS=--max-old-space-size=8192`; abrir um projeto por vez; ao reabrir após OOM marcar "Don't restore editors". Ver seção CURSOR_EVITAR_OOM em DOCS CONSOLIDADOS.
- **NUNCA apagar o banco** — **NUNCA** rodar `prisma migrate reset`. Ele apaga todos os dados. Usar só `migrate dev` ou `migrate deploy`. Se drift, propor alternativas — nunca reset.

**Comandos principais:** `docker compose up -d db` | `pnpm install` (raiz) | `cd apps/web && pnpm dev` | `cd apps/api && pnpm start:dev`

---

# 📅 POR DIA — ENCERRAMENTOS

# 📅 29 DE MAIO DE 2026 — ENCERRAMENTO (FINAL)

## **PARA O PRÓXIMO AGENTE (LEIA PRIMEIRO)**

- **Deploy em `develop`:** último commit **`3f8cb6b`** — atalhos personalizados na barra superior + ajustes UI dashboard (push enviado).
- **No servidor:** `./deploy.sh` — migration nova **`20260528120000_user_dashboard_shortcuts`** (`User.dashboardShortcuts` JSON, 5 slots).
- **Atalhos:** barra superior do dashboard (`DashboardHeaderShortcuts`); picker só mostra páginas com acesso; persistência `GET/PATCH /me/dashboard-shortcuts`.
- **UI:** login centralizado; CUP360 sidebar/header; breadcrumb com nome real do hub; Dashboard Master com `DashboardDeptHeader` padrão; menu — Depto Futebol logo após Requisições.
- **Beatscode produção:** import via S3 + CLI no servidor (`beatscode:import:file`) para `boston-city-fc-brasil` — ok.
- **Arquivos locais não versionados:** `backup_clean.sql`, `temp_*`, `scripts/extract-*.mjs`, `apps/api/apps/` — **não commitar**.

## **O QUE FOI FEITO**

1. **Atalhos personalizados (5 slots)**  
   - Migration + API Nest; proxy Next `/api/me/dashboard-shortcuts`.  
   - Botões na **barra superior** com ícone + nome abreviado; clique direito para trocar/remover.

2. **UI dashboard / login / CUP360**  
   - Rebranding CUP360 (sidebar, header, login, favicon).  
   - Login centralizado; logo/texto sidebar maiores; texto do hub na barra superior.  
   - Header roxo padrão no Dashboard Master (`MasterDashboardHeader` client component).  
   - Stats do dept header — texto centralizado nas caixas (layout original).

3. **Menu**  
   - Ordem: Requisições → Depto de Futebol (só essa mudança; resto igual).

4. **FMF / classificação (manhã)**  
   - Parser tabela oficial FMF; sync substitui legado Google Sheets; filtros campeonato no editor.

5. **Beatscode + deploy**  
   - Import completo por tenant; `deploy.sh` com `CI=true` + devDependencies para `nest build`.  
   - Import produção Boston City FC Brasil via S3 + script no servidor.

## **ARQUIVOS PRINCIPAIS**

- API: `me.controller.ts`, `me.service.ts`, migration `20260528120000_user_dashboard_shortcuts`
- Web: `DashboardUserShortcuts.tsx`, `dashboard-shortcuts.ts`, `header.tsx`, `MasterDashboardHeader.tsx`, `dashboard/page.tsx`, `login/page.tsx`, `dashboard-menu.config.ts`

## **COMMITS / BRANCH**

- **Branch:** `develop`
- **Último commit:** `3f8cb6b` — feat(web): atalhos personalizados na barra e ajustes de UI do dashboard
- **Push:** enviado para `origin/develop`

---

# 📅 29 DE MAIO DE 2026 — ENCERRAMENTO

## **PARA O PRÓXIMO AGENTE (LEIA PRIMEIRO)**

- **Deploys em `develop` (push ok):** `7e626ff` (classificação FMF calculada + parser tabela oficial), `a289a9b` (filtro padrão no campeonato do clube, sem “Todas” em competições), `7dc7140` (sync FMF **substitui** linhas legadas da planilha Google — não faz merge).
- **No servidor:** `./deploy.sh` + **Importação FMF → Importar → Aplicar no site** em **Boston City FC Brasil** e **Villa Nova** (limpa dados antigos tipo “Mineirão” / Apollo-RJ da planilha).
- **Classificação:** fonte = FMF (`fmf-classificacao.parser.ts`, `resolveStandings`); sem jogos finalizados = ordem oficial FMF; com jogos = cálculo 3 pts / 1 empate. Editor de página: `TabelaClassificacaoModuleEditor` (sem Google Sheets).
- **API local:** se der `Cannot find module './dashboard.controller'`, apagar `apps/api/dist` e `pnpm run build` na API; usuário reinicia `start:dev` manualmente (regra `nao-subir-api.mdc`).
- **Arquivos locais não versionados:** `backup_clean.sql`, `temp_*.js`, `scripts/extract-*.mjs`, `apps/api/apps/` — **não commitar**.

## **O QUE FOI FEITO**

1. **FMF — classificação**  
   - Parser HTML da tabela oficial (antes de “PG: Pontos Ganhos”).  
   - `resolveStandings`: FMF se zero jogos; calculado + merge se há jogos finalizados.  
   - Sync restrito a `boston-city-fc-brasil` e `villa-nova-saf`; tabela por categoria (Sub-14/15/17/20, Módulo II).

2. **Editor / UI**  
   - Removido botão “Atualizar com Google Sheets” (tenant, group-home, evento).  
   - `TabelaClassificacaoSection`: filtro padrão no campeonato do clube; sem opção “Todas” em competições; categorias/temporadas filtradas por campeonato.

3. **Correção dados legados**  
   - `fmf-page-sync`: ao aplicar no site, `tabelaManualRows` = só FMF (remove planilha Mineirão/Carioca misturada).

4. **Deploys**  
   - Três pushes em `develop`; build `pnpm build` ok antes de cada deploy.

## **ARQUIVOS PRINCIPAIS**

- API: `fmf-classificacao.parser.ts`, `fmf-scraper.service.ts`, `fmf-page-sync.service.ts`, `fmf-sync-tenants.config.ts`
- Web: `TabelaClassificacaoSection.tsx`, `TabelaClassificacaoModuleEditor.tsx`, editores de página (tenant/group-home/evento)

## **COMMITS / BRANCH**

- **Branch:** `develop`
- **Último commit:** `7dc7140` — fix: sync FMF substitui tabela legada da planilha Google
- **Push:** enviado para `origin/develop`

---

# 📅 28 DE MAIO DE 2026 — ENCERRAMENTO

## **PARA O PRÓXIMO AGENTE (LEIA PRIMEIRO)**

- **Deploy feito:** commit `79d7974` em `develop`, push para `origin/develop` (build `pnpm build` ok antes do commit).
- **No servidor:** rodar `pnpm exec prisma migrate deploy` (3 migrations Imprensa: `20260528140000_tenant_press_imprensa`, `20260528180000_tenant_press_page_access_code`, `20260528190000_tenant_press_credential_request`) e reiniciar API.
- **Preferência do usuário:** **NÃO subir/reiniciar a API** localmente — regra `.cursor/rules/nao-subir-api.mdc`.
- **Dashboard — header padrão:** layout injeta `DashboardPageFrame` + header violeta (`DashboardDeptHeader`) em todo o dashboard via `dashboard-page-meta.ts`. Páginas com header dinâmico (Mídia, hubs, edit de atleta, etc.) estão na lista de exclusão em `DASHBOARD_AUTO_HEADER_EXCLUDE`.
- **Imprensa:** módulo completo — API `tenant-press`, página pública `/portfolio/[slug]/imprensa`, dashboard `/dashboard/assessoria-imprensa`, press releases por data, credenciais, galeria/upload por token.
- **Hino:** tipo de módulo no page builder (`HinoModuleEditor`, `HinoClubeSection`, `AudioMediaPicker`, upload MP3 pasta hino no S3).
- **Auth fix:** controllers `diretoria`, `marketing-posts`, `socio-*` — guards unificados `JwtAuthGuard + DashboardRolesGuard + ModuleAccessGuard` (corrige "Not authenticated" na Diretoria).
- **Mídia/S3 (incluído no repo):** otimização WebP no upload, auditoria órfãos/duplicatas, UI em Mídia para super_admin, script `s3:lifecycle`.
- **Arquivos locais não versionados:** `backup_clean.sql`, `temp_legal_orig.txt` — **não commitar**.

## **O QUE FOI FEITO**

1. **Imprensa (API + web + público)**  
   - Módulo Nest `tenant-press`; migrations Prisma; rotas públicas press (fotos, upload, credencial, access-code).  
   - Dashboard editorial: releases, jornalistas, códigos de acesso, links fotógrafos.  
   - Página pública do clube com hub de imprensa.

2. **Padronização visual do dashboard**  
   - `DashboardDeptHeader`, `DashboardDeptSection`, `DashboardPageFrame`, `dashboard-page-meta.ts`.  
   - Migração em massa das páginas do dashboard (remoção de headers `text-3xl` antigos).  
   - Hubs e páginas especiais mantêm header explícito.

3. **Módulo Hino**  
   - Editor no page builder; seção pública com player de áudio; picker de mídia MP3.

4. **Correções e mídia**  
   - Guards de autenticação em Diretoria/Marketing/Sócio torcedor.  
   - Melhorias S3/mídia (sharp, auditoria, consolidate/purge órfãos).

5. **Deploy**  
   - Build monorepo ok; commit + push `develop`.

## **ARQUIVOS PRINCIPAIS**

- API: `tenant-press/*`, `diretoria.controller.ts`, `marketing-posts.controller.ts`, `socio-*.controller.ts`, `media/*`, `s3.service.ts`, migrations Imprensa
- Web: `DashboardDeptHeader.tsx`, `DashboardPageFrame.tsx`, `dashboard-page-meta.ts`, `assessoria-imprensa/`, `components/press/*`, `HinoClubeSection.tsx`, `HinoModuleEditor.tsx`, ~75 `dashboard/**/page.tsx`
- Scripts: `strip-dashboard-old-headers.mjs`, `fix-empresas-edit-header.mjs`

## **COMMITS / BRANCH**

- **Branch:** `develop`
- **Último commit:** `79d7974` — feat: imprensa, header padrao do dashboard e correcoes de auth
- **Push:** enviado para `origin/develop`

---

# 📅 28 DE MAIO DE 2026 — SESSÃO (mídia/S3, acessos, logo BCH, DX Cursor)

## **PARA O PRÓXIMO AGENTE (LEIA PRIMEIRO)**

- **Preferência do usuário:** **NÃO subir/reiniciar a API** (`pnpm --filter api start:dev`, porta 3001). O usuário sempre sobe a API manualmente. Web, docker/db, build, migrate, seed etc. podem rodar normalmente. Regra em `.cursor/rules/nao-subir-api.mdc`.
- **PENDENTE COMMIT + DEPLOY:** grande parte desta sessão está **só local** (ver lista de arquivos abaixo). Últimos commits no remoto: `d35c4f0` (logo BCH), `4ffbb52` (acessos Omie). Antes de deploy: `pnpm build` na raiz (último build **ok**).
- **Mídia / S3 — o que foi implementado (local):**
  - **Otimização de upload** com `sharp` → WebP no `S3Service`: logos (512px), fotos de mídia (por pasta), imagens de documentos (1600px). PDFs não são convertidos. Arquivos: `optimize-upload-image.ts`, alterações em `s3.service.ts`.
  - **MediaPicker:** botão **“Enviar foto”** com upload direto (`POST /api/media`) — corrige Construção Web onde só havia dropdown.
  - **Auditoria S3:** `MediaStorageAuditService` — órfãos (arquivo no bucket sem referência no banco) e **duplicatas** (mesmo ETag + tamanho). Endpoints API (só `super_admin`): `GET /media/storage-audit`, `POST /media/purge-orphans?dryRun=1`, `POST /media/consolidate-duplicates?dryRun=1`. Proxies web em `/api/media/*`. UI no card **“Organização do S3”** em `dashboard/midia/page.tsx`.
  - **Unificar duplicatas:** `MediaUrlReplaceService` troca referências no banco e apaga cópias extras (simular antes com `dryRun=1`).
  - **Utilitários:** `media-key.util.ts` (`mediaKeyFromStoredUrl`, `collectMediaKeysFromJson`).
  - **Lifecycle S3 (script, não executado na AWS):** `pnpm --filter api run s3:lifecycle` → `scripts/apply-s3-lifecycle.ts` (abort multipart 7d + Intelligent-Tiering em `media/` e `logos/`).
- **Após deploy:** super_admin → **Mídia** → **Analisar armazenamento** → simular/executar unificar duplicatas e limpar órfãos. Lifecycle na AWS: rodar `s3:lifecycle` uma vez com credenciais (`s3:PutLifecycleConfiguration`).
- **Acessos (já deployado `4ffbb52`):** Financeiro, Compras e Estoque **sem grupo Omie** — independentes em Configurações → Acessos. Sync migra `group_omie` → slugs individuais.
- **Logo Boston City Hall (já deployado `d35c4f0`):** estática em `apps/web/public/boston-city-hall-logo.png` (`BCH_LOGO_STATIC`); componente `BostonCityHallLogo.tsx`; sidebar com `object-contain`.
- **DX / Cursor:** `apps/api/package.json` simplificado (scripts sem aspas escapadas; Jest em `jest.config.js`; `prestart:dev` → `scripts/clear-tsbuildinfo.js`) para corrigir erro “Npm task detection: failed to parse package.json”. `.vscode/settings.json` → `npm.packageManager: pnpm`; `.vscode/tasks.json` com tasks pnpm.
- **Arquivos locais não versionados:** `backup_clean.sql`, `temp_legal_orig.txt` — **não commitar**.
- **Opcional futuro:** refatorar `visiting-team-logo-merge.util.ts` para reutilizar `media-key.util.ts`.

## **O QUE FOI FEITO**

1. **Acessos (deployado)**  
   - Removido `accessGroup: "omie"` de Financeiro/Compras/Estoque; sync de permissões sem `group_omie`.

2. **Logo BCH (deployado)**  
   - Logo fora do CDN `/logos/*`; header/sidebar Boston City Hall.

3. **Mídia / S3 (local — aguardando commit/deploy)**  
   - Otimização centralizada no `S3Service` (logos, mídia, docs imagem).  
   - Auditoria órfãos + duplicatas; purge e consolidate com dry-run.  
   - UI super_admin em Mídia; rotas proxy web.  
   - Script lifecycle S3; dependência `sharp` em `apps/api`.

4. **Upload Construção Web (local)**  
   - `MediaPicker`: botão enviar foto.

5. **Tooling (local)**  
   - Fix parse `package.json` API; regra não subir API; tasks VS Code.

## **ARQUIVOS PRINCIPAIS (pendentes no git)**

- API: `s3.service.ts`, `optimize-upload-image.ts`, `media-storage-audit.service.ts`, `media-url-replace.service.ts`, `media-key.util.ts`, `media.controller.ts`, `media.module.ts`, `scripts/apply-s3-lifecycle.ts`, `jest.config.js`, `scripts/clear-tsbuildinfo.js`, `package.json`
- Web: `midia/page.tsx`, `MediaPicker.tsx`, `app/api/media/storage-audit|purge-orphans|consolidate-duplicates/`
- Config: `.vscode/settings.json`, `.vscode/tasks.json`, `.cursor/rules/nao-subir-api.mdc`, `pnpm-lock.yaml`

## **COMMITS / BRANCH**

- **Branch:** `develop`
- **Último commit remoto desta linha de trabalho:** `d35c4f0` (logo BCH)
- **Mídia/S3:** ainda **sem commit** — usuário pode pedir **deploy** no próximo chat

---

# 📅 25 DE MAIO DE 2026 — ENCERRAMENTO (RH colaboradores, cadastro de atletas, hubs dashboard, permissões)

## **PARA O PRÓXIMO AGENTE (LEIA PRIMEIRO)**

- **RH / Colaboradores:** cadastro mestre em `Employee` com **matrícula** (`code`, ex. `COL-000001`), **cargo** via vínculo ativo (`Employment`), **foto** (`photoUrl`) e link opcional com atleta (`playerId`). **Vínculo Futebol fica fora do form RH** — usar `EmployeeLinkPlayerDialog` na lista (ícone/botão Vincular). Modal do colaborador: **coluna única**, seções expansíveis (`ExpandableSection`), largura total do dialog, sem scroll lateral (`EmployeeFormDialog.tsx`).
- **Lista RH:** agrupada **empresa → tipo → tabela**, linhas clicáveis (`FuncionariosGroupedList.tsx`); mesma lista em ADM → RH e Cadastros → Funcionários.
- **Atleta ↔ RH:** matrícula RH no perfil do jogador preenchida automaticamente quando há vínculo (`RhEmployeeLinkCard`, `PlayerRegistrationSections`); sync CPF/RG em `employee-player-link.ts`.
- **Migrations pendentes no servidor:** `20260525120000_employee_photo_url` e `20260525140000_employee_code_player_link` — rodar `pnpm --filter api exec prisma migrate deploy` após deploy.
- **Cadastro de atletas:** seções expansíveis, lista agrupada por empresa/categoria, documentos, situação (desligado/emprestado), empréstimos, arquivo de desligados e emprestados.
- **Dashboard:** hubs visuais ADM, Saúde e Cadastros; linhas clicáveis em várias listagens (`ClickableTableRow`).
- **Configurações → Módulos:** acessos por perfil, presets de permissão, Financeiro incluído na tela de acessos.
- **Arquivos locais não versionados:** `backup_clean.sql`, `temp_legal_orig.txt` — não commitar.

## **O QUE FOI FEITO**

1. **RH (API + web)**  
   - Migrations: foto do colaborador; matrícula `code` + `playerId` link com `Player`.  
   - Endpoints: link/create/unlink atleta, `GET by-player/:playerId`, geração de matrícula.  
   - UI: form com seções (empresa/tipo, identificação+foto, pessoais, contato, observações); lista agrupada; diálogo de vínculo Futebol separado; card RH no edit do jogador.

2. **Cadastros — Futebol / atletas**  
   - `registrationProfile` expandido; seções expansíveis no edit; lista agrupada; filtros; páginas emprestados e arquivo de desligados; documentos, contratos, empréstimo, histórico de categoria.

3. **Dashboard e UX**  
   - Hubs ADM, Saúde, Cadastros com insights; linhas clicáveis em listagens de cadastros, eventos, comissão, etc.

4. **Permissões**  
   - Tela de módulos com acessos por perfil; presets; correção para listar todos os menus (incl. Financeiro).

## **COMMITS DO DIA (`develop`)**

- `75399ad` — fix(rh): modal colaborador em coluna única com seções expansíveis  
- `3f895eb` — feat(rh): form compacto, lista empresa→tipo e vínculo Futebol separado  
- `9242d0d` — feat(rh): lista agrupada por empresa e linhas clicáveis em todas as abas  
- `f168d9e` — feat(rh): matrícula, cargo no colaborador e vínculo com cadastro de atleta  
- `a3755df` — feat(rh): foto do colaborador, abas reordenadas e listagem formatada  
- `91cba6b` — fix(config): listar todos os menus na tela de acessos incluindo Financeiro  
- `1f98bee` — feat(config): acessos por perfil e seção na tela de módulos  
- `18c17d1` — feat(cadastros): documentos, situação, empréstimos e arquivo de desligados  
- `c2f87bc` — feat(cadastros): cadastro de atletas com seções expansíveis e lista agrupada  
- `638bb62` — feat(dashboard): hubs visuais ADM/Saúde/Cadastros e linhas clicáveis nas listagens  

**Branch:** `develop` · **Último commit:** `75399ad` · **Push:** enviado para `origin/develop`

---

# 📅 24 DE MAIO DE 2026 — ENCERRAMENTO (Dashboard mobile, menu Academias embed, infra Academias Lightsail)

## **PARA O PRÓXIMO AGENTE (LEIA PRIMEIRO)**

- **Dashboard BCG no celular:** sidebar vira **gaveta** no mobile (ícone ☰ no header); no desktop (≥1024px) continua fixo. Contexto: `DashboardShellContext.tsx`; shell: `DashboardLayoutShell.tsx`, `header.tsx`, `sidebar.tsx`.
- **Academias no menu BCG:** links internos `/dashboard/academias/gestao` e `/dashboard/academias/portal` com iframe (`DashboardEmbedFrame.tsx`, `academias-embed.ts`). **Ferramentas** é penúltimo item (antes de Configurações).
- **Servidor Academias (Lightsail `52.71.253.45`) — fora deste repo:** login OK em `academias.bostoncitygroup.biz`; CORS só no Apache (Nest `enableCors` removido no container); `DATABASE_URL` → `127.0.0.1` em `/opt/boston/.env.prd`; usuário `rl@bostoncitygroup.biz` (senha scrypt, mín. 6 chars); cache anti-JS antigo no vhost Apache. **Pendente:** dados (franquia/academia), portal aluno deploy, fix permanente CORS no código-fonte Academias, `frame-ancestors` se iframe BCG ficar em branco.
- **Arquivos locais não versionados:** `backup_clean.sql`, `temp_legal_orig.txt` — não commitar.
- **BCG produção:** após push, rodar `./deploy.sh` no servidor se o CI não aplicar sozinho; `prisma migrate deploy` se migrations pendentes (módulo `academias`, role `comissao`).

## **O QUE FOI FEITO**

1. **Menu e navegação (web)**  
   - Ferramentas reposicionada antes de Configurações.  
   - Hub Academias com embed interno (Gestão + Portal do aluno).

2. **Responsivo dashboard inteiro (web)**  
   - Menu hamburger, overlay, sidebar oculto por padrão no mobile.  
   - Header compacto; conteúdo em tela cheia.

3. **Infra Academias (SSH, não commitado)**  
   - Correção CORS (Apache + patch/remoção Nest).  
   - Banco conectado; primeiro usuário admin; login 201 via curl e browser.  
   - Limpeza de cache no navegador + headers Apache no frontend gestão.

## **COMMITS DO DIA (`develop`)**

- `857e4ac` — fix(dashboard): Ferramentas penúltima no menu  
- `5f3d4a2` — feat(academias): embed gestão e portal dentro do dashboard BCG  
- `c900b61` — feat(dashboard): sidebar colapsável e layout responsivo no mobile  

**Branch:** `develop` · **Push:** enviado para `origin/develop`

---

# 📅 14 DE MAIO DE 2026 — ENCERRAMENTO (Merge develop → main: cadastros normalizados, patrimônio, manual no header, ADM financeiro/estoque, Marketing Meta, permissões)

## **PARA O PRÓXIMO AGENTE (LEIA PRIMEIRO)**

- **`main` foi alinhada com `develop`** nesta data: todo o trabalho listado abaixo está na branch **`main`** remota (`origin/main`), não só em `develop`.
- **Regra nova de dados:** textos de cadastro gravados em **MAIÚSCULAS** (pt-BR); **e-mails** sempre **minúsculos**. Implementação central em `apps/api/src/common/cadastro-text.ts` — **usar estes helpers** em novos CRUDs; **não** aplicar em URLs, slugs, IDs externos, enums técnicos, JSON profundo, highlights como URL, campos de integração (ex.: `Player.category`, `status`, `preferredFoot` mantidos como já documentado no código).
- **Patrimônio:** bem pode **mudar de clube e de categoria** no editar; API valida categoria do novo clube e jogador atribuído no mesmo tenant (`PATCH` aceita `tenantId`). UI: `AssetFormDialog.tsx`.
- **Manual da plataforma:** acesso pelo ícone **?** no **header** do dashboard (`header.tsx`); item foi **removido da sidebar**; rota `/dashboard/manual`. Há parágrafo no manual sobre maiúsculas/e-mail.
- **Financeiro ADM:** lançamentos internos (pagar/receber) **sem** Omie na tela ADM; Omie permanece visão **Diretoria/gerencial** onde já existia.
- **Estoque ADM:** produtos/movimentos alinhados a futebol (`inventoryKind`, `squadTags`, categorias do tenant).
- **Marketing:** OAuth Meta, publicação FB/IG, scheduler (`MarketingSchedulerService`), variáveis `META_*`; imagens via padrão `media-url`.
- **Permissões / Saúde / Boston TV:** matriz de módulos, roles gerente/administrativo, módulo Saúde unificado, ajustes de UX em configurações.
- **Arquivos locais não versionados (se existirem):** `backup_clean.sql`, `temp_legal_orig.txt` — não entrar em commits.
- **`pnpm build`:** API (`apps/api`) e Web (`apps/web`) foram verificados após as alterações recentes de cadastro/patrimônio; repetir se tocar nos mesmos pacotes.

## **O QUE FOI FEITO (RESUMO POR TEMA)**

1. **Normalização de cadastros (API)**  
   - Novo módulo `cadastro-text.ts` (`cadastroUpper`, `cadastroUpperRequired`, `cadastroEmail`, `cadastroJsonStringArray`).  
   - Aplicado em: cadastros (campeonatos, estádios, times visitantes, comissão, jogadores com regras de exceção, jurídico), tenants, usuários (nome), RH (funcionários, vínculos, deptos, cargos), compras (fornecedores, produtos), financeiro ADM (textos dos lançamentos), patrimônio (categorias e bens), tipos de empresa, equipe médica, psicólogos, grupo master.  
   - Documentação de uso e limites no próprio arquivo-fonte + parágrafo em `apps/web/src/app/dashboard/manual/page.tsx`.

2. **Patrimônio**  
   - `UpdateAssetDto` com `tenantId` opcional; `assets.service` valida coerência clube/categoria/jogador.  
   - Web: selects de clube e categoria **editáveis**; reset de categoria ao trocar clube se inválida; `PATCH` envia `tenantId`.

3. **Manual / dashboard**  
   - Link do manual no header (`CircleHelp`); remoção do item no menu lateral e ajustes de texto introdutório.

4. **Área administrativa (trabalho acumulado já em `develop`)**  
   - Financeiro interno ADM; estoque com famílias/tags de time; evoluções anteriores de patrimônio (foto, media-url, UX).

5. **Marketing Meta (trabalho acumulado)**  
   - OAuth, publicação, cron de agendamento, proxy para redirects, miniaturas alinhadas a `media-url`.

6. **Permissões e configuração (trabalho acumulado)**  
   - Matriz, presets, auditoria, roles novas, módulo Saúde, Boston TV, ESLint API (`fileURLToPath`).

## **COMMITS INTEGRADOS EM `main` (ordem: mais recente primeiro)**

Estes commits estavam em `develop` à frente de `main` e passam a fazer parte de `main` com o merge do dia **14/05/2026** (histórico completo no `git log`):

- `8aa31fe` — feat(api): cadastros em maiúsculas e e-mails minúsculos; patrimônio permite mudar clube e categoria  
- `a9fc6fc` — feat(web): manual no header (?), remove do menu lateral  
- `81b67b3` — feat(docs): manual no menu, atalho no dashboard e UI sem textos de ajuda longos  
- `773c992` — feat(adm): estoque por futebol + financeiro sem Omie no ADM  
- `8be4635` — feat(financeiro): contas pagar/receber internas e Omie como gerencial  
- `aa5217b` — fix(ui): patrimonio layout largo, PhotoUploadWithName, dialog mais amplo, preview media-url  
- `eff2254` — fix(patrimonio): UX lista agrupada, media-url nas fotos, sem scroll-x; pasta patrimonio na mídia  
- `8ab96ce` — feat(patrimonio): select nativo em modais, foto do bem, tipos de categoria e peça  
- `9d67584` — docs: encerramento 29 abril 2026 — Marketing Meta FB/IG e media-url no Planner  
- `b543118` — marketing: agendamento Meta (FB/IG), ScheduleModule e miniaturas via media-url  
- `8820f97` — fix(MediaPicker): select nativo para funcionar dentro de dialog (Planner imagens)  
- `afe7684` — chore(cursor): regra passo a passo — um passo por vez até OK do usuário  
- `a5ccf82` — feat(marketing): selects nativos no modal, token Meta persistido, status, publicação Facebook  
- `2854043` — fix(api-proxy): repassar redirects ao navegador para OAuth Meta funcionar  
- `8e218c1` — feat(meta-oauth): versão Graph configurável e checklist de autorização na UI do Marketing  
- `bd2ff7d` — feat(marketing): botão Conectar Meta no Planner (OAuth start, só super admin)  
- `3b5eded` — feat(api): OAuth Meta — rotas integration/meta/oauth start e callback  
- `90bcca1` — feat(permissoes): roles gerente e administrativo na matriz e usuarios  
- `cdb2d6a` — fix(config): matriz de módulos — restaura rótulos Company admin e Editor  
- `496a962` — feat: módulo Saúde (unifica médico/psico), Boston TV próprio e matriz Gerente/Adm/Saúde  
- `5fd35e1` — fix(api): eslint.config.mjs usa fileURLToPath para tsconfigRootDir (corrige TS2339)  
- `44a1431` — feat(web): UX explicativo em permissões (pacotes, JSON e panorama)  
- `26a7097` — feat(config): matriz de módulos com presets, export JSON e auditoria detalhada  
- `29f5b30` — feat(permissões): áreas funcionais na matriz, ações em lote e auditoria  

## **ARQUIVOS / PASTAS-CHAVE (RASTREIO RÁPIDO)**

| Área | Caminhos principais |
|------|---------------------|
| Regra de texto | `apps/api/src/common/cadastro-text.ts` |
| Patrimônio API | `apps/api/src/patrimonio/*`, DTO `update-asset.dto.ts` |
| Patrimônio Web | `apps/web/src/app/dashboard/adm/patrimonio/components/AssetFormDialog.tsx` |
| Manual / header | `apps/web/src/components/dashboard/header.tsx`, `apps/web/src/app/dashboard/manual/page.tsx`, `apps/web/src/lib/dashboard-menu.config.ts` |
| Financeiro ADM | `apps/api/src/financeiro/*`, `apps/web/src/app/dashboard/adm/financeiro/*` |
| Estoque | `apps/api/src/compras/products.service.ts`, `apps/web/.../adm/estoque/*` |
| Marketing Meta | `apps/api/src/integrations/meta/*`, `apps/api/src/marketing/*`, Planner web |

## **FECHAMENTO (GIT) — 14/05/2026**

- **Branch de trabalho:** `develop` — último commit **antes** do merge em `main`: `818e4b6` (só documentação do diário); funcionalidades imediatamente anteriores: `8aa31fe` (cadastros + patrimônio).  
- **Merge em `main`:** commit **`528e8e254a40674e27c310cca1e7e05b4a1a2e88`** — mensagem: `chore(release): merge develop em main — encerramento 14/05/2026 (cadastros, patrimônio, manual, ADM, marketing, permissões)`.  
- **`main` antes do merge:** `74c8fa9`.  
- **Pós-merge:** `main` contém **todo** o histórico de `develop` listado na seção de commits acima, mais o merge commit acima.  
- **Push:** `git push origin main` e `git push origin develop` (manter remotes alinhados).  
- **Não versionados:** `backup_clean.sql`, `temp_legal_orig.txt` (locais).  

---

# 📅 29 DE ABRIL DE 2026 — ENCERRAMENTO (Planner Marketing: Meta Facebook + Instagram, agendamento real, imagens no padrão media-url)

## **O QUE FOI FEITO**

1. **Publicação Meta na mesma implementação (FB + IG)**
   - `MetaOAuthService.publishMarketingPostScheduled`: lê `platforms` do post; publica na **Página** (feed com texto ou `/photos` com imagem pública + legenda) e no **Instagram** (`/{ig-user-id}/media` + `media_publish`) quando a Página tem **Instagram Business** vinculado.
   - URL de imagem para a Graph API via **`graphPublicImageUrl`** (domínio oficial, `key=` em query, S3 BCG, `META_IMAGE_PUBLIC_ORIGIN`); Instagram exige imagem HTTPS pública.
   - `externalIds` parciais (ex.: só Facebook) e `notes` com erros por plataforma; status `published` / `failed` conforme resultado.

2. **Agendamento real (cron)**
   - Dependência **`@nestjs/schedule`**; **`ScheduleModule.forRoot()`** no `AppModule`.
   - **`MarketingSchedulerService`**: a cada minuto busca `MarketingPost` com `status: scheduled` e `scheduledAt <= now`, chama `publishMarketingPostScheduled`; **ignora** itens só com LinkedIn (sem Meta). Desligar com **`META_SCHEDULER_DISABLED=1`** se várias instâncias da API sem lock.

3. **Rota “publicar agora”**
   - `POST .../publish-facebook` passa a exigir Facebook e/ou Instagram marcados e delega ao mesmo fluxo `publishMarketingPostScheduled` (sem divergir do cron).

4. **Dashboard Marketing — miniaturas das imagens**
   - Alinhado ao padrão do diário em **`media-url.ts`**: `resolvePublicMediaUrlForDisplay` → `resolveMediaUrlWithProxyFallback` → `getPublicImageUrl` (função local `plannerMediaThumbSrc` em `marketing/page.tsx`).

5. **Build**
   - `pnpm build` na raiz executado com sucesso antes do commit da feature.

## **ARQUIVOS ENVOLVIDOS (PRINCIPAIS)**

**API:** `apps/api/package.json`, `pnpm-lock.yaml`, `apps/api/src/app.module.ts`, `apps/api/src/integrations/meta/meta-oauth.service.ts`, `apps/api/src/marketing/marketing.module.ts`, `apps/api/src/marketing/marketing-scheduler.service.ts` (novo).

**Web:** `apps/web/src/app/dashboard/marketing/page.tsx`.

## **FECHAMENTO (GIT)**

- **Branch:** develop
- **`b543118` —** `marketing: agendamento Meta (FB/IG), ScheduleModule e miniaturas via media-url` (código + lockfile)
- **`docs/` —** entrada **29 abril 2026** (este arquivo) incluída no mesmo push para `develop`
- **Push:** ✅ commits da feature + documentação para `origin/develop`
- **Build:** `pnpm build` na raiz ok antes do push do encerramento
- **Não versionados (locais):** `backup_clean.sql`, `temp_legal_orig.txt`

---

# 📅 9 DE ABRIL DE 2026 — ENCERRAMENTO (Diretoria + Omie: fluxo de caixa, compras por mês, credenciais por tenant)

## **O QUE FOI FEITO**

1. **Dashboard Diretoria**
   - Integração de **pedidos de compra** (API Omie `PesquisarPedCompra`): agregação por **data de inclusão** do pedido, janela de **6 meses** (`chartComprasPorMes`) e totais por empresa no mês corrente + pendentes.
   - **Fluxo de caixa**: KPIs (receber / pagar / saldo); abaixo, grid **2/3 + 1/3** — gráfico **a receber e a pagar por empresa** alinhado aos dois primeiros cards e **saldo por empresa** (barras horizontais) alinhado ao terceiro.
   - **Grade inferior** (ordem fixa): coluna **Compras** (6 meses + por empresa), **Clubes** (jogadores/sócios), **Crescimento** (6 meses). Textos de UI enxutos.

2. **API — Omie e Diretoria**
   - `OmieService`: paginação compras, `chavesUltimosMesesIso`, acúmulo por mês (`parseOmieDataDdmmaaaa` para não conflitar com `parseDataBR` legado), `resumoPedidosCompraDashboard` com histórico + pendentes.
   - `DiretoriaService` / `GET /diretoria/omie-financeiro`: `chartComprasPorMes`, `chartComprasPorEmpresa`, campos de compras por empresa no DTO.

3. **Credenciais Omie por empresa (tenant)**
   - Prisma: campos cifrados `omieAppKeyEnc` / `omieAppSecretEnc` (+ IVs), migration `20260409120000_tenant_omie_credentials`.
   - `TenantsService`: gravar/limpar credenciais; `OmieService` usa credenciais do tenant quando configuradas.
   - Web: edição de empresa, tipo `Tenant`, rota proxy status Omie; módulo **financeiro** (Nest) para telas administrativas.

4. **Build**
   - `pnpm build` na raiz executado com sucesso antes do commit.

## **ARQUIVOS ENVOLVIDOS (PRINCIPAIS)**

**API:** `apps/api/src/integrations/omie/omie.service.ts`, `apps/api/src/diretoria/*`, `apps/api/src/tenants/*`, `apps/api/src/financeiro/`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20260409120000_tenant_omie_credentials/`, `app.module`, `dashboard.service`, `vault.module`, etc.

**Web:** `apps/web/src/app/dashboard/diretoria/page.tsx`, `apps/web/src/app/dashboard/empresas/[id]/edit/page.tsx`, `apps/web/src/app/dashboard/adm/financeiro/page.tsx`, `apps/web/src/types/tenant.ts`, `apps/web/src/app/api/settings/integrations/omie/status/route.ts`, `AnaliseFilters.tsx` (ajuste pontual).

## **FECHAMENTO (GIT)**

- **Branch:** develop
- **Hash:** `4658b08`
- **Commit:** `feat(diretoria): Omie compras por mês, layout fluxo 2/3+1/3; credenciais Omie por tenant; financeiro`
- **Push:** ✅ para `origin/develop`
- **Não versionados (locais):** `backup_clean.sql`, `temp_legal_orig.txt`

---

# 📅 20 DE MARÇO DE 2026 — ENCERRAMENTO (Mídia Clubes Adv, merge times visitantes, logos nos fixtures públicos)

## **O QUE FOI FEITO**

1. **Dashboard Mídia — filtro “Clubes Adv”**
   - A listagem usava `?sizeKey=clubes_adv` (prefixo `media/clubes-adv/` no S3) em vez dos logos em `logos/clubes-adv/`. Ajuste: usar `?all=1` e filtrar no cliente por `logos/clubes-adv/` e `logos/external/`.

2. **Select de time visitante / adversário (cadastro + S3)**
   - Merge entre `VisitingTeam` e logos reais no bucket: deduplicação por nome (acentos, hífens, remoção de `de`/`da`/`do`); só entra cadastro com `logoUrl` que resolve para arquivo existente; correspondência por **basename** após migração `external` → `clubes-adv`; fallback de rótulo para arquivo só UUID sem nome na Mídia.
   - `mediaKeyFromStoredUrl` no web para URLs salvas (incl. `/api/public/media-asset?key=...`).

3. **API pública — fixtures (Próximos jogos / evento)**
   - `PublicService` enriquece `homeTeamLogoUrl` / `awayTeamLogoUrl` com o mesmo mapa S3 + cadastro + `MediaMeta` (`visiting-team-logo-merge.util.ts`, `MediaModule` no `PublicModule`).
   - Enriquecimento **sempre** aplica URL canônica quando o nome do time bate no mapa (corrige JSON vazio ou URL antiga).

4. **Página pública — exibição da imagem**
   - `resolvePublicMediaUrlForDisplay` em `media-url.ts`: prioriza key `logos/*`/`media/*`; proxy em dev com `mediaKeyFromStoredUrl` + `extractPublicMediaKey`.
   - `ProximosJogosSection` e `FixtureTeamLogo` usam essa resolução para não cair no fallback estático `/logos/teams-externos/...`.

5. **Deploys**
   - Vários commits/push em `develop` ao longo do dia (midia, visiting-teams, public fixtures, fix de URL pública).

## **ARQUIVOS ENVOLVIDOS (PRINCIPAIS)**

**Web:** `apps/web/src/app/dashboard/midia/page.tsx`, `apps/web/src/lib/visiting-teams-merge.ts`, `apps/web/src/lib/names-match.ts`, `apps/web/src/lib/media-url.ts`, `apps/web/src/components/portfolio/modules/ProximosJogosSection.tsx`, `apps/web/src/components/portfolio/FixtureTeamLogo.tsx`.

**API:** `apps/api/src/public/public.service.ts`, `apps/api/src/public/public.module.ts`, `apps/api/src/public/visiting-team-logo-merge.util.ts`.

## **FECHAMENTO (GIT)**

- **Branch:** develop
- **Push:** ✅ para origin/develop (inclui atualização deste encerramento em `docs/DESENVOLVIMENTO_DIARIO.md`)
- **Commits do dia (referência):** `0978e32` (midia Clubes Adv), `3ad7104` (merge visiting teams), `d0efc99` (API pública fixtures + logos), `5ac36e8` (resolvePublicMediaUrl + enrich); em seguida commits só em `docs/DESENVOLVIMENTO_DIARIO.md` para este encerramento
- **Não versionados:** `backup_clean.sql`, `temp_legal_orig.txt` (locais)

---

# 📅 18 DE MARÇO DE 2026 — ENCERRAMENTO (Consultas: fotos jogador/psicólogo, duração ao encerrar)

## **O QUE FOI FEITO**

1. **Fotos na lista de consultas**
   - Substituição dos ícones genéricos (bonecos) pelas fotos reais do jogador e do psicólogo no calendário de consultas.
   - API: `playerPhotoUrl` e `psychologistPhotoUrl` em `listAllConsultations()`.
   - Web: `ConsultasCalendar.tsx` — `<img>` com foto quando existir; fallback para ícone.

2. **Duração ao encerrar sessão**
   - Ao clicar em "Encerrar sessão", o tempo do cronômetro é salvo: (a) na consulta do jogador (`durationSeconds` em `onlineConsultations`); (b) no cadastro do psicólogo (`attendanceLog` com `date`, `startTime`, `playerId`, `playerName`, `durationSeconds`, `notes`).
   - API: `updateConsultation` aceita `durationSeconds`; ao marcar `completed`, grava no player e no psicólogo.
   - Web: `sessao/page.tsx` — envia `durationSeconds` no PATCH ao encerrar.

3. **Exibição da duração**
   - Histórico de consultas (filtro por atleta): "Duração: Xmin" para consultas realizadas.
   - Cadastro do psicólogo: coluna "Duração" na tabela de registro de presença.

## **ARQUIVOS ENVOLVIDOS**

**API:** `consultations/consultations.service.ts`, `consultations/consultations.controller.ts`.

**Web:** `ConsultasCalendar.tsx`, `consultas/page.tsx`, `consultas/sessao/page.tsx`, `psicologia/psicologos/[id]/edit/page.tsx`, `types/psychologist.ts`.

## **FECHAMENTO (GIT)**

- **Último commit:** `c814277` — Consultas: fotos jogador/psicólogo, salvar duração ao encerrar sessão
- **Branch:** develop
- **Push:** ✅ para origin/develop

---

# 📅 18 DE MARÇO DE 2026 — ENCERRAMENTO (Deferred upload, displayName fotos, header sticky)

## **O QUE FOI FEITO**

1. **Deferred upload + displayName em departamentos**
   - Médico, psicologia e comissão: mesmo fluxo dos jogadores — foto só é enviada ao clicar em Salvar, com nome automático (nome-sobrenome-departamento).
   - API: MediaMetaService exportado; UploadController aceita `displayName` em `/upload/logo` e grava no MediaMeta.
   - Frontend: `pendingPhotoFile`, upload no `handleSave`/`handleSubmit` com `getPhotoDisplayName()`.

2. **DisplayName em logos**
   - Grupo: `displayName` = nome do grupo (ex.: Boston City Group).
   - Empresa: `displayName` = nome - país - cidade (ex.: Clube ABC - Brasil - São Paulo).
   - Arquivos: `grupo/page.tsx`, `empresas/[id]/edit`, `empresas/new`, `upload.controller.ts`, `upload.module.ts`, `media.module.ts`.

3. **Header sticky em páginas de cadastro/edição**
   - Jogadores (edit + new), Depto médico (equipe edit/new), Psicologia (psicólogos edit/new), Comissão (edit/new), Histórico médico (por jogador), Empresas (edit).
   - Header fixo no topo: nome, avatar, botão Salvar/Cadastrar sempre visíveis ao rolar a página.
   - Classes: `sticky top-0 z-20 -mx-4 sm:-mx-6 bg-background/95 backdrop-blur border-b`.

## **ARQUIVOS ENVOLVIDOS**

**API:** `media/media.module.ts` (exports MediaMetaService), `upload/upload.module.ts` (MediaModule), `upload/upload.controller.ts` (displayName + MediaMetaService).

**Web:** `medico/equipe/[id]/edit`, `medico/equipe/new`, `medico/[playerId]`, `psicologia/psicologos/[id]/edit`, `psicologia/psicologos/new`, `futebol/comissao/[id]/edit`, `futebol/comissao/new`, `cadastros/jogadores/[id]/edit`, `cadastros/jogadores/new`, `empresas/[id]/edit`, `grupo/page.tsx`, `empresas/new`.

## **FECHAMENTO (GIT)**

- **Último commit:** `bc68c23` — docs: encerramento 18 mar 2026
- **Commits do dia:** `60ac65c` (deferred upload + displayName), `5eb14ca` (header sticky)
- **Branch:** develop
- **Push:** ✅ para origin/develop

---

# 📅 10 DE MARÇO DE 2026 — DEPLOY (Dashboard Diretoria clubes vs empresas, Marketing, Nutrição, Patrimônio, Sócio-torcedor)

## **O QUE FOI FEITO**

- **Dashboard Diretoria:** Separação por tipo de empresa — clubes (futebol) com jogadores, sócios, comissão, psicólogos; empresas (construtoras, etc.) com fornecedores, produtos, gasto mês, pagamentos a realizar. Gráficos: clubes (jogadores/sócios), empresas (gastos/pendências), crescimento (6 meses).
- **Correção build:** Tooltip formatter do Recharts (formatter aceita `value | undefined`).
- **Regra deploy:** `pnpm build` antes de commit; deploy-develop.mdc atualizado.

## **TESTE ANTES DE SUBIR**

Sempre rodar `pnpm build` na raiz antes de commitar. Se falhar, corrigir e só então fazer deploy.

## **REBOOT NO SERVIDOR (System restart required)**

Quando o Ubuntu mostrar **"*** System restart required ***"** no login:

```bash
sudo reboot
```

Após o reboot, reconectar via SSH. **Se a API não subiu:** o PM2 não inicia processos automaticamente até configurar `pm2 startup` (uma vez). Ver seção **PM2_STARTUP** em DOCS CONSOLIDADOS. Enquanto isso, rodar: `cd ~/bcg-site && ./deploy.sh`.

## **FECHAMENTO (GIT)**

- **Commit:** `cdc54e3` — Dashboard Diretoria (clubes vs empresas), Marketing, Nutrição, Patrimônio, Sócio-torcedor; fix Tooltip; build ok
- **Branch:** develop
- **Push:** ✅ para origin/develop

---

# 📅 9 DE MARÇO DE 2026 — ENCERRAMENTO (Fisiologia, Análise, Avaliações, Financeiro/Omie, Depto Compras completo)

## **O QUE FOI FEITO NESTA SESSÃO**

### 1. Fisiologia (Depto Futebol)
- **Schema:** Campo `Player.physiology` (Json) no Prisma para avaliação física do atleta.
- **Migration:** `20260322000000_add_player_physiology`.
- **API:** DTOs e endpoints em `players` para leitura/atualização de `physiology`; tipos em `physiology-types.ts`.
- **Web:** Bloco `PhysiologyBlock`, filtros `FisiologiaFilters`, página `/dashboard/futebol/fisiologia` com filtro por Clube/Categoria/Atleta (estilo Médico/Jurídico).

### 2. Análise de desempenho (Depto Futebol)
- **Schema:** Campo `Player.analysisMetrics` (Json) no Prisma.
- **Migration:** `20260323000000_add_player_analysis_metrics`.
- **API:** DTOs e service para `analysisMetrics`; tipos em `analysis-types.ts`.
- **Web:** `AnalysisBlock` (Status, Avaliações com dimensões e comportamento, Métricas scout, Relatório), `AnaliseFilters`, página `/dashboard/futebol/analise`.

### 3. Sidebar e menu
- Ajuste: marcar ativo apenas o primeiro item por `href` (evita dois itens destacados quando Avaliações e Status tinham o mesmo link).
- Menu alterado: submenu **Diretoria** trocado por **Avaliações**; item único "Diretoria" quando aplicável.

### 4. Avaliações (Depto Diretoria)
- **Página:** `/dashboard/futebol/avaliacoes` com proteção `canAccessModule("diretoria")`.
- **Bloco:** `EvaluationsBlock` com campo de comportamento; `AvaliacoesFilters` (Clube, Categoria, Atleta).
- CRUD de avaliações na tela com mesma busca de jogador dos outros departamentos.

### 5. Financeiro (Adm) e integração Omie
- **API:** `OmieService` (env `OMIE_APP_KEY`, `OMIE_APP_SECRET`), teste ListarContasReceber; endpoint `GET /settings/integrations/omie/status`.
- **Web:** Rota Next `/api/settings/integrations/omie/status`; card Omie em Configurações → Integrações; página `/dashboard/adm/financeiro` com status da integração e link para config.

### 6. Departamento de Compras (Adm) — completo
- **Schema Prisma:** Modelos `Supplier`, `Product`, `PurchaseRequisition`, `PurchaseOrder`, `StockMovement`. Relações no `Tenant`: `suppliers`, `products`, `purchaseRequisitions`, `purchaseOrders`. Migration `20260324000000_add_compras_models`.
- **API:** Módulo `ComprasModule` com:
  - **Fornecedores:** `GET/POST/PATCH/DELETE /compras/suppliers` (filtro tenantId, search).
  - **Produtos:** `GET/POST/PATCH/DELETE /compras/products` e `GET /compras/products/stock-alerts` (produtos com currentStock ≤ stockMin).
  - **Requisições de compra:** `GET/POST/PATCH/DELETE /compras/purchase-requisitions` (status: draft, sent, quotation, approved, rejected, ordered, received).
  - **Ordens de compra:** `GET/POST/PATCH/DELETE /compras/purchase-orders` (vínculo opcional com requisição, fornecedor obrigatório).
  - **Movimentações de estoque:** `GET /compras/stock-movements/by-product/:productId`, `POST /compras/stock-movements` (entrada/saída/ajuste; atualiza `product.currentStock`).
- Rotas protegidas com `@RequireModule('adm_compras')` e `ModuleAccessGuard`.
- **Dependência:** `class-transformer` adicionada na API (para DTOs com `@Type()` aninhados).
- **Web:** Página `/dashboard/adm/compras` com:
  - Filtro por clube/empresa; abas: Alertas de estoque | Produtos | Fornecedores | Requisições de compra | Ordens de compra.
  - **CRUD Fornecedores:** dialog novo/editar (clube, nome, contato, e-mail, telefone, observações); excluir com confirmação.
  - **CRUD Produtos:** dialog novo/editar (clube, nome, SKU, unidade, estoque mín./atual); excluir com confirmação.
  - **CRUD Requisições:** dialog com itens dinâmicos (produto opcional, descrição, qtd, unidade, preço unit. estimado), solicitante, justificativa, total estimado, status (na edição); excluir com confirmação.
  - **CRUD Ordens:** dialog com fornecedor (obrigatório), requisição (opcional), nº OP, previsão de entrega, itens (produto opcional, descrição, qtd, preço unit.), total, status (na edição); excluir com confirmação.
  - Componentes em `compras/components/`: `SupplierFormDialog`, `ProductFormDialog`, `PurchaseRequisitionFormDialog`, `PurchaseOrderFormDialog`. AlertDialog único para confirmação de exclusão.

### 📁 ARQUIVOS ENVOLVIDOS

**API:** `prisma/schema.prisma` (physiology, analysisMetrics, modelos Compras, relações Tenant), migrations `20260322000000_add_player_physiology`, `20260323000000_add_player_analysis_metrics`, `20260324000000_add_compras_models`; `cadastros/players.service.ts`, `create-player.dto.ts`, `update-player.dto.ts`; `integrations/omie/omie.service.ts`, `integrations.module.ts`, `integrations.controller.ts`; `compras/` (module, DTOs, controllers, services); `app.module.ts` (ComprasModule); `package.json` (class-transformer).

**Web:** `dashboard/futebol/fisiologia/` (page, FisiologiaFilters), `dashboard/futebol/analise/` (page, AnaliseFilters), `dashboard/futebol/avaliacoes/` (page, AvaliacoesFilters); `PhysiologyBlock.tsx`, `AnalysisBlock.tsx`, `EvaluationsBlock.tsx`; `physiology-types.ts`, `analysis-types.ts`; `dashboard-menu.config.ts`, `components/dashboard/sidebar.tsx`; `dashboard/adm/financeiro/page.tsx`, `dashboard/configuracoes/integracoes/page.tsx`, `app/api/settings/integrations/omie/status/route.ts`; `dashboard/adm/compras/page.tsx`, `dashboard/adm/compras/components/` (SupplierFormDialog, ProductFormDialog, PurchaseRequisitionFormDialog, PurchaseOrderFormDialog).

**Docs:** `DESENVOLVIMENTO_DIARIO.md` (este encerramento).

### 🚀 FECHAMENTO (GIT)

- **Commit:** `fb35e9c` — Fisiologia, Análise, Avaliações, Financeiro/Omie, Depto Compras completo; encerramento 9 mar 2026
- **Branch:** develop
- **Push:** ✅ para origin/develop

---

# 📅 7 DE MARÇO DE 2026 — ENCERRAMENTO (Cadastro Comissão Técnica, Psicólogos, Jurídico todos contratos)

## **O QUE FOI FEITO NESTA SESSÃO**

1. **Cadastro de Comissão Técnica** — Modelo Prisma `TechnicalStaff` (tenantId, name, photoUrl, role, categories JSON, birthDate, nacionalidade, cpf, rg, email, phone, address, licenças, contrato CLT/PJ/estágio, bio, notes). API Nest: `GET/POST/PATCH/DELETE /technical-staff` com filtros (tenantId, category, role, search). Frontend: listagem com filtros (Clube, Categoria, Função, Busca), tabela (foto, nome, função, clube, categorias, licença/validade, contrato até, ações), novo membro (dados básicos, licenças, vínculo), editar e excluir. Constantes em `staff-roles.ts` (funções e tipos de contrato). Visual alinhado ao cadastro de atletas.
2. **Correções Comissão** — Parser Turbopack: tipo dos props da page extraído para `ComissaoPageProps` (evita "Expected ident"). `UpdateTechnicalStaffDto` definido explicitamente com todos os campos opcionais (PartialType não gerava tipos). Campo JSON `categories`: uso de `Prisma.JsonNull` no create em vez de `null`.
3. **Outros no commit** — Módulo Psicólogos (API + web: listagem, novo, editar, excluir). Jurídico: endpoint e UI "Todos os contratos"; contrato assinado com opção Baixar. Ajustes em consultas, médico, sidebar, menu.

### 📁 ARQUIVOS ENVOLVIDOS

**API:** `prisma/schema.prisma` (TechnicalStaff), `cadastros/technical-staff.*`, `cadastros/dto/create-technical-staff.dto.ts`, `dto/update-technical-staff.dto.ts`, `cadastros.module.ts`; `psychologists/` (controller, service, module, DTOs); `all-legal-documents.controller.ts`, `legal-documents.*`, `consultations.*`, `hello-sign.service.ts`; migration `20260321000000_add_psychologist`.

**Web:** `dashboard/futebol/comissao/` (page, ComissaoFilters, new, [id]/edit, [id]/delete), `lib/staff-roles.ts`; `psicologia/psicologos/` (listagem, novo, editar, excluir), `types/psychologist.ts`; `juridico/` (page, JuridicoFilters), `LegalDocumentsTab.tsx`; `medico/MedicoFilters`, `consultas/page.tsx`, `ConsultasCalendar.tsx`, `cadastros/jogadores/[id]/edit`, `sidebar.tsx`, `dashboard-menu.config.ts`, `player-module-types.ts`.

### 🚀 FECHAMENTO (GIT)

- **Commit:** `6c90258` — Cadastro Comissão Técnica completo + psicólogos API/web + jurídico todos contratos + fixes (parser page, DTO update, Prisma JsonNull); encerramento 7 mar 2026
- **Branch:** develop
- **Push:** ✅ para origin/develop

---

# 📅 7 DE MARÇO DE 2026 — ENCERRAMENTO (Fundador/Hero: dados no banco, fallbacks no editor, script de verificação)

## **O QUE FOI FEITO NESTA SESSÃO**

1. **Fundador e Hero — dados no banco** — Confirmado via script que `Group.homeContent.blocks` (grupo bcg) contém os blocos hero e founder com config preenchido (heroSlides, titlePt; imageUrl, bodyPt, quotePt, etc.). O editor esperava chaves diferentes (founderPhoto, biographyPT, highlightQuotePT).
2. **Fallbacks no editor (group-home editar)** — Bloco **founder**: leitura com compatibilidade retroativa — `founderPhoto ?? imageUrl`, `biographyPT ?? bodyPt`, `biographyEN ?? bodyEn`, `highlightQuotePT ?? quotePt`, `highlightQuoteEN ?? quoteEn`. Bloco **hero**: já lia heroSlides (e heroImages); adicionada nota de que os dados estão no banco e `<details>` do hero aberto por padrão. Mensagem na UI: "Os dados do fundador, da biografia e do hero estão no banco; chaves antigas (imageUrl, bodyPt, quotePt) são lidas automaticamente."
3. **Fix parsing** — Removido `</details>` duplicado no bloco founder que causava "Expression expected" e Build Error em dev (e quebraria o build em produção).
4. **Script de verificação** — `apps/api/scripts/check-group-home-blocks.ts`: lê Group bcg e imprime config dos blocos hero e founder (para confirmar dados no banco). Uso: `pnpm exec ts-node -r tsconfig-paths/register scripts/check-group-home-blocks.ts` (a partir de apps/api).

### 📁 ARQUIVOS ENVOLVIDOS

**Web:** `apps/web/src/app/dashboard/paginas/group-home/editar/page.tsx` (founder IIFE com fallbacks, hero note e open, fix </details> duplicado).

**API:** `apps/api/scripts/check-group-home-blocks.ts` (novo).

### 🚀 FECHAMENTO (GIT)

- **Commit:** `68d9802` — Fundador/Hero: dados no banco, fallbacks no editor, script check-group-home-blocks, fix parsing; encerramento 7 mar 2026
- **Branch:** develop
- **Push:** ✅ para origin/develop

---

# 📅 7 DE MARÇO DE 2026 — ENCERRAMENTO (Contato emergência, Depto Médico, Fase 3 módulos, Jurídico no Futebol, Relatórios após Marketing)

## **O QUE FOI FEITO NESTA SESSÃO**

1. **Contato e emergência do jogador** — Campos `contactEmail`, `contactPhone`, `emergencyContactName`, `emergencyContactEmail`, `emergencyContactPhone` no cadastro; salvamento garantido (payload sempre envia os três de emergência; Prisma client regenerado). Formatação de telefone BR/EUA em `format-phone.ts`. Exibição no Depto Médico (bloco "Contato de emergência" no final do card).
2. **Depto Médico** — Mensagem de sucesso ao salvar: banner verde na lista (dropdown) e modal + banner na página do atleta. DTO `medicalHistory` passou a aceitar objeto `{ profile, records }` além de array (corrige "medicalHistory must be an array").
3. **Fase 3 — Novos módulos e rotas** — Migration `20260320000000_add_fase3_modules`: Module + ModuleRole para Adm (adm_financeiro, adm_compras, adm_rh, adm_patrimonio, adm_nutricao, adm_estoque), Futebol (futebol_comissao, futebol_fisiologia, futebol_analise), Relatórios (relatorios), Sócio Torcedor (socio_torcedor), Marketing (marketing). Menu: grupo Adm, itens Futebol (Comissão técnica, Fisiologia, Desempenho em Análise), Sócio Torcedor, Marketing. Páginas placeholder em `/dashboard/adm/*`, `/dashboard/futebol/comissao|fisiologia|analise`, `/dashboard/socio-torcedor`, `/dashboard/marketing`. Sidebar com estado de abertura para adm, futebol, relatórios, socio, marketing.
4. **Menu** — "Jurídico" renomeado para **Depto Jurídico** e movido para dentro de **Futebol** (após Depto Psicologia). **Relatórios** movido para depois de **Marketing** (ordem: Sócio Torcedor → Marketing → Relatórios → Ferramentas → Configurações).

### 📁 ARQUIVOS ENVOLVIDOS

**API:** `prisma/schema.prisma`, `prisma/migrations/20260320000000_add_fase3_modules/`, `cadastros/dto/create-player.dto.ts`, `cadastros/dto/update-player.dto.ts`, `cadastros/players.service.ts`, `consultations/` (notify, controller, service, module).

**Web:** `dashboard-menu.config.ts`, `sidebar.tsx`, `ModulePlaceholderPage.tsx`, `MedicalHistoryBlock.tsx`, `format-phone.ts`, `feedback-modal.tsx`, `player-module-types.ts`, `DashboardLayoutShell.tsx`; páginas: `medico/`, `relatorios/`, `adm/*`, `futebol/*`, `socio-torcedor/`, `marketing/`, `juridico/`, `diretoria/`, `psicologia/`, `consultas/` (incl. sessao, abrir-meet); `cadastros/jogadores/**` (edit, contact/emergency, handleSave); `configuracoes/modulos/page.tsx`.

**Docs:** `DESENVOLVIMENTO_DIARIO.md`, `MODULOS_SIDEBAR_DESENHO.md`.

### 🚀 FECHAMENTO (GIT)

- **Commit:** `bbf0110` — Contato/emergência jogador, Depto Médico (feedback salvar), Fase 3 módulos, Jurídico no Futebol, Relatórios após Marketing + encerramento 7 mar 2026
- **Branch:** develop
- **Push:** ✅ para origin/develop  

---

# <span style="color: red; font-size: 28px;">📅 6 DE MARÇO DE 2026 — ENCERRAMENTO (Controle Jurídico: modal Enviar, dropdown, pageCount PDF)</span>

## **MODAL ENVIAR PARA ASSINATURA, DROPDOWN E PÁGINAS REAIS DO PDF**

### 🎯 **O QUE FOI FEITO HOJE:**

1. **Modal "Enviar para assinatura"** — Dropdown "Página da assinatura" quebrava: o conteúdo do Radix Select (Portal em `document.body`) ficava **atrás** do `<dialog>` nativo (top layer). Solução: **select HTML nativo** no modal, sem Portal — funciona dentro do dialog.
2. **Dialog** — Removido drag handle e lógica de arrastar; evita interceptar cliques e simplifica o componente.
3. **Número de páginas do PDF** — No upload do documento jurídico: extração do **pageCount** com `pdf-lib` no controller; campo **pageCount** em `LegalDocument` (Prisma + migration); dropdown do modal passa a listar só **Página 1 … Página N** conforme o total de páginas do PDF (evita erro "página selecionada é maior que o número de páginas do PDF").

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**Modificados:**  
`apps/web/src/components/dashboard/LegalDocumentsTab.tsx` (select nativo, uso de `pageCount` no dropdown), `apps/web/src/components/ui/dialog.tsx` (sem drag), `apps/api/src/cadastros/legal-documents.controller.ts` (pdf-lib, pageCount no create), `apps/api/src/cadastros/legal-documents.service.ts` (pageCount em create), `apps/api/prisma/schema.prisma` (pageCount Int?)

**Criados:**  
`apps/api/prisma/migrations/20250218_add_pagecount_legal_document/migration.sql`

**Dependência:**  
`pdf-lib` adicionada em `apps/api/package.json`

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Commits do dia:** `c7984bb` (simplifica modal Enviar, remove drag do dialog), `7ac7089` (select nativo no modal), `e18b4dc` (pageCount do PDF no upload e dropdown com páginas reais)
- **Branch:** `develop`
- **Push:** ✅ para origin/develop

---

# <span style="color: red; font-size: 28px;">📅 3 DE MARÇO DE 2026 — ENCERRAMENTO (Carrossel logos, Buildertrend sidebar)</span>

## **CARROSSEL, BUILDERTREND, DEPLOY**

### 🎯 **O QUE FOI FEITO HOJE:**

1. **Carrossel de logos** — Tamanho padronizado para todos; link para `/portfolio/{slug}` (ex.: americanofc); shuffle para evitar logos repetidos em sequência.
2. **Buildertrend no sidebar** — Tentativa de iframe bloqueada (X-Frame-Options); implementado link externo em nova aba (`target="_blank"`).
3. **Fix** — Erro de sintaxe no sidebar (operador `||` órfão na expressão `isActive`).

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**Modificados:** `apps/web/src/components/portfolio/modules/LogoCarouselSection.tsx`, `apps/web/src/components/dashboard/sidebar.tsx`

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Commits do dia:** `2546b7d` (carrossel logos), `9439247` (Buildertrend link externo)
- **Branch:** `develop`
- **Push:** ✅ para origin/develop

---

# <span style="color: red; font-size: 28px;">📅 3 DE MARÇO DE 2026 — ENCERRAMENTO (Tabela Player, migrate:player-fix, sync jogadores)</span>

## **MIGRATION PLAYER, SCRIPT MANUAL, TRATAMENTO DE ERRO SYNC**

### 🎯 **O QUE FOI FEITO HOJE:**

1. **Tabela Player ausente no servidor** — Erro `The table public.Player does not exist`. O modelo estava no schema mas não havia migration. Criada `20260304000000_add_player_table`.
2. **Script migrate:player-fix** — `pnpm run migrate:player-fix` aplica o SQL da migration diretamente, útil quando `prisma migrate deploy` diz "No pending migrations" mas a tabela não existe.
3. **Sync jogadores — tratamento de erro** — route e SyncPlayersButton exibem a mensagem real do backend (message/error) em vez de genérica.

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**Criados:** `apps/api/prisma/migrations/20260304000000_add_player_table/migration.sql`  
**Modificados:** `apps/api/package.json`, `apps/web/src/app/api/integrations/sync-players/route.ts`, `apps/web/src/app/dashboard/cadastros/jogadores/SyncPlayersButton.tsx`, `docs/DESENVOLVIMENTO_DIARIO.md`

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Commits do dia:** `505481f` (migration Player), `e1ab2d4` (migrate:player-fix), `dcf90f7` (sync + encerramento)
- **Branch:** `develop`
- **Push:** ✅ para origin/develop

---

# <span style="color: red; font-size: 28px;">📅 2 DE MARÇO DE 2026 — ENCERRAMENTO (Acentuação módulos, sidebar Clubes/Empresas, logo grupo MediaPicker)</span>

## **ACENTUAÇÃO, SIDEBAR, LOGO DO GRUPO**

### 🎯 **O QUE FOI FEITO HOJE:**

1. **Permissões dos Módulos** — Acentuação correta na tabela: `MODULE_DISPLAY_NAMES` em `dashboard-labels.ts` mapeia slug → nome exibido (evita mojibake no servidor).
2. **Sidebar Cadastros** — Reorganizado: submenu **Clubes** (Categorias, Campeonatos, Estádios, Times adversários) e submenu **Empresas** (Listagem). Usuários permanece direto.
3. **Logo do grupo** — MediaPicker para escolher da pasta logos/ do S3 em vez de só abrir explorador local; opção "Enviar novo do computador" mantida. Cache busting na img para evitar exibição de logo antiga (Atlético).
4. **Fix** — Parênteses no `useState` (?? com ||) no sidebar.

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**Criado:** `apps/web/src/lib/dashboard-labels.ts`  
**Modificados:** `apps/web/src/app/dashboard/configuracoes/modulos/page.tsx`, `apps/web/src/components/dashboard/sidebar.tsx`, `apps/web/src/app/dashboard/grupo/page.tsx`

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Último commit:** `831423b` (MediaPicker logo grupo + cache busting; sidebar Clubes/Empresas)
- **Branch:** `develop`
- **Push:** ✅ para origin/develop

---

# <span style="color: red; font-size: 28px;">📅 27 DE FEVEREIRO DE 2026 — ENCERRAMENTO (Tabela classificação, sectionSize, CSV BOM, deploy migrate)</span>

## **TABELA CLASSIFICAÇÃO, DENSIDADE, CSV UTF-8, PRISMA MIGRATE NO DEPLOY**

### 🎯 **O QUE FOI FEITO HOJE:**

1. **Tabela de classificação** — Módulo completo: filtros (Competições, Categoria, Temporada), colunas Pos/Time/P/J/V/E/D/GP/GC/SG/Últ. Resultados/Próximo, barra compacta centralizada, max 4 linhas visíveis em section com scroll.
2. **sectionSize (Tabela)** — Mínimo, Compacto, Normal, Grande: controla densidade (padding, fonte, logos) quando o módulo está em section. TabelaRow recebe `density`.
3. **Section module spacing** — `sectionPaddingTop` (Mínimo/Compacto/Normal/Grande) também controla `space-y` entre módulos na coluna (minimal=space-y-4, compact=space-y-6, etc.).
4. **CSV UTF-8 BOM** — Acentuação correta nos downloads: tabela-listas, all, visiting-teams, championships, stadiums, proximos-jogos. BOM `\uFEFF` no início.
5. **Upload logo** — apiProxy: preservar Content-Type original (multipart boundary) ao repassar request. Fix "Envie um arquivo (campo file)".
6. **Deploy servidor** — Erro `Championship.logoUrl does not exist`: migrations não eram aplicadas. Adicionado `prisma migrate deploy` ao `deploy.sh` antes de `prisma generate`.

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**Modificados:** `deploy.sh`, `docs/DESENVOLVIMENTO_DIARIO.md`  
**Commit principal do dia:** `285c243` (37 arquivos: TabelaClassificacaoSection, SectionBlockRenderer, apiProxy, CSV routes, campeonatos logo/standingsFormula, etc.)

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Último commit:** (deploy.sh + DESENVOLVIMENTO_DIARIO)
- **Branch:** `develop`
- **Push:** ✅ para origin/develop

---

# <span style="color: red; font-size: 28px;">📅 27 DE FEVEREIRO DE 2026 — ENCERRAMENTO (Imagens 403/CORP, galeria 2ª linha)</span>

## **IMAGENS NOTÍCIAS/GALERIA — CORP, PROXY, GALERIA SEGUNDA LINHA**

### 🎯 **O QUE FOI FEITO HOJE:**

1. **Erro 403 nas fotos** — Inicialmente tentamos priorizar `imageUrlOriginal` (URL direta) para evitar 403 do proxy; deploy b2438b9.
2. **Descoberta: era CORP, não 403** — Screenshots mostraram `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin 200 (OK)`: Instagram/CDN enviam `Cross-Origin-Resource-Policy: same-origin`, bloqueando URL direta no browser. Revertemos para priorizar proxy — servidor busca a imagem e serve do nosso domínio (commit 4ffe1f2).
3. **NoticiasSection e GaleriaSection** — Proxy como fonte primária; fallback para URL original quando proxy falha.
4. **noticias-feed** — Retorna `imageUrlOriginal` além de `imageUrl`; limite máximo de 20 → 50 itens.
5. **GaleriaItem (home-content.ts)** — Campo opcional `imageUrlOriginal` para fallback.
6. **Galeria 2ª linha não aparecia** — Tentativas: galeria pede 3× maxItems ao feed (pool maior); retry automático (até 2x) em falha; `loading="eager"` em todas as imagens (evitar lazy na 2ª linha). **Pendente para amanhã:** ajustar segunda linha (ainda placeholders em alguns casos).

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**Modificados:**  
`apps/web/src/app/api/public/noticias-feed/route.ts`, `apps/web/src/components/portfolio/modules/NoticiasSection.tsx`, `apps/web/src/components/portfolio/modules/GaleriaSection.tsx`, `apps/web/src/types/home-content.ts`, `docs/DESENVOLVIMENTO_DIARIO.md`

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Commits do dia (ordem):** `b2438b9` (imageUrlOriginal), `4ffe1f2` (proxy/CORP), `8bda838` (galeria retry/3x feed), `f2160c4` (loading eager), `c95ac64` (encerramento)
- **Branch:** `develop`
- **Push:** ✅ para origin/develop

---

# <span style="color: red; font-size: 28px;">📅 25 DE FEVEREIRO DE 2026 — ENCERRAMENTO (Nginx WorkMail/Vault, regra encerrar o dia)</span>

## **EXCEÇÕES NGINX /api/workmail e /api/vault, REGRA ENCERRAR O DIA**

### 🎯 **O QUE FOI FEITO HOJE:**

1. **Nginx — WorkMail e Vault em produção (404)** — O backend Nest usa `@Controller('api/workmail')` e `@Controller('api/vault')`; com `location /api/` → 3001 e `proxy_pass .../`, o path chegava sem `/api/` e dava 404. Adicionadas exceções no exemplo: `location ^~ /api/workmail/` e `location ^~ /api/vault/` para Next (3000); o Next faz proxy com path completo para o backend.
2. **Regra encerrar o dia** — Criada/atualizada `.cursor/rules/encerrar-o-dia.mdc`: ao dizer "encerre o dia", executar commit de tudo, adicionar bloco 📅 [DATA] — ENCERRAMENTO no topo de POR DIA em `docs/DESENVOLVIMENTO_DIARIO.md`, e push para origin (develop). Alinhada à seção REGRAS DIÁRIAS do desenvolvimento diário.

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**Modificados:**  
`docs/nginx-bostoncitygroup.biz.example.conf`, `.cursor/rules/encerrar-o-dia.mdc`, `docs/DESENVOLVIMENTO_DIARIO.md`

*Outros arquivos no commit (de sessões anteriores):* `apps/api/prisma/migrations/...`, `apps/api/scripts/seed-local-user.ts`, `apps/web/src/app/api/public/group/route.ts`, `scripts/check-env-server.sh`

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Commit:** `4cc91bd`
- **Push:** ✅ para origin/develop

---

# <span style="color: red; font-size: 28px;">📅 18 DE FEVEREIRO DE 2026 — ENCERRAMENTO (Login Cognito: callback /auth/callback, getCallbackOrigin, hint, authFetch)</span>

## **CALLBACK COMO PÁGINA, POST API, URL CANÔNICA, ERRO COGNITO NA TELA**

### 🎯 **O QUE FOI FEITO HOJE (sessão login):**

1. **Callback Cognito em página (/auth/callback)** — Cognito passou a redirecionar para **/auth/callback** (página) em vez de /api/auth/callback; o `code` fica na URL no browser e é enviado por **POST** para a API trocar por tokens. Evita proxy/Nginx cortar o query string.
2. **API POST /api/auth/callback** — Aceita `{ code, state, redirect_uri }` no body; troca o code por tokens no Cognito, define cookies e devolve `{ redirect }`. GET mantido por compatibilidade.
3. **getCallbackOrigin()** — Em produção usa sempre **NEXT_PUBLIC_APP_URL** para montar a redirect_uri no login e no callback, evitando mismatch www vs não-www com o Cognito.
4. **Erro do Cognito na tela** — API devolve `cognitoError` quando a troca de tokens falha; a página de login exibe "Cognito: …" quando há hint (pendente: garantir que o hint apareça sempre).
5. **authFetch** — Em páginas públicas (fora de /dashboard) não tenta mais /api/auth/refresh ao receber 401, evitando 403 no console.
6. **Suspense em /auth/callback** — useSearchParams() envolvido em Suspense para atender exigência do Next.js no prerender.
7. **Fallback env no callback** — COGNITO_DOMAIN, COGNITO_CLIENT_ID e valores de produção como fallback no servidor.

**Pendente para próximo dia:** Login ainda retorna `error=auth` em produção; conferir Allowed callback URLs no Cognito (`https://www.bostoncitygroup.biz/auth/callback`) e que NEXT_PUBLIC_APP_URL está setado no build; validar exibição do hint do Cognito na tela.

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**Modificados:**  
`apps/web/src/app/api/auth/callback/route.ts`, `apps/web/src/app/auth/callback/page.tsx`, `apps/web/src/app/auth/login/route.ts`, `apps/web/src/app/login/page.tsx`, `apps/web/src/lib/authFetch.ts`, `apps/web/src/lib/cognito-hosted-ui.ts`, `seção TOKEN_STORAGE neste arquivo`

### 🚀 **FECHAMENTO DO DIA (GIT):**

- **Últimos commits:** `c0704c3`, `016df50`, `2a1cb16`, `00ce4b4`, `967a1d1`, `d2e4cd1`, `3ebe1fd`, `d9cd461`, entre outros.
- **Branch:** `develop`
- **Push:** ✅ para origin/develop (working tree clean).

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

- Seção PLANILHA_TIMES_CATEGORIAS_GOOGLE_SHEETS (neste arquivo): como usar dropdowns (Validação de dados), congelar linha, listas para categoria/posição/pe_dominante.
- Seção REGRAS_DIARIAS (neste arquivo): **Encerrar o dia** — quando o usuário escrever "encerre o dia", commitar tudo, atualizar resumo em `DESENVOLVIMENTO_DIARIO.md` e dar push para o Git externo.

---

### 📁 **ARQUIVOS ENVOLVIDOS NESTE ENCERRAMENTO:**

**Criados:**  
`apps/web/src/app/api/google-sheets/times-categorias/route.ts`, `apps/web/public/templates/times-categorias-template.csv`, seção DOCS CONSOLIDADOS (neste arquivo)

**Modificados:**  
`apps/web/src/app/dashboard/paginas/tenant/[tenantId]/editar/page.tsx`, `apps/web/src/components/portfolio/modules/TimesCategoriasSection.tsx`, `apps/web/src/lib/football-positions.ts`, este arquivo

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
- **Arquivos:** este arquivo (seção REGRAS_DIARIAS)
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

1. Seção REGRAS_DIARIAS (neste arquivo) — Regras oficiais do projeto
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

Se não houver credenciais, a API retorna 500 com mensagem orientando. Ver seção **AWS_CREDENTIALS** (neste arquivo) (IAM policy mínima e comando de teste: GET /users com Bearer token).

---

### 📌 **Regra: Módulos do dashboard (resumo diário e regras)**

**Todo novo módulo do dashboard deve vir para a tela Configurações → Módulos.**
Regra registrada na seção **REGRAS_DIARIAS** e detalhada na seção **MODULOS_DASHBOARD** (neste arquivo). Ao criar um novo módulo: cadastrar em Module + ModuleRole no backend, adicionar no menu da sidebar com o mesmo `moduleSlug`, e proteger a página com `canAccessModule("slug")`.

---

# <span style="color: red; font-size: 28px;">📅 31 DE JANEIRO DE 2026</span>

## **LOGO S3, GRUPO MASTER, MÓDULOS, LOGOUT E DASHBOARD INFORMATIVO**

### 🎯 **O QUE FOI FEITO:**

#### 1. **Upload de logo (S3)**

- **Backend:** `S3Module` + `S3Service`; endpoint `POST /upload/logo` (multipart, `scope`: `'group'` ou `tenantId`); bucket configurável via `AWS_S3_BUCKET`.
- **Banco:** Campo `logoUrl` em `Tenant`; migration aplicada.
- **Frontend:** Página editar empresa com upload de logo; lista de empresas com coluna Logo; Grupo Master com upload de logo do grupo.
- **Doc:** seção S3_BUCKET_POLICY (neste arquivo) (política S3 e Block Public Access).

#### 2. **Grupo Master (Group)**

- **Backend:** Modelo `Group` (name, slug, logoUrl, description); `GET /group` e `PATCH /group`; `GET` público para header/sidebar; `PATCH` e upload de logo do grupo restritos a `super_admin`.
- **Frontend:** Sidebar e Header exibem nome e logo do grupo; página "Grupo Master" para editar nome, descrição e logo; `DashboardHead` define título e favicon dinâmicos.

#### 3. **Permissões por módulo**

- **Backend:** Modelos `Module` e `ModuleRole`; seed de módulos (dashboard, grupo_master, usuarios, empresas, tipos, paginas, noticias, midia, configuracoes); `GET /me/modules` (módulos do usuário); `GET/PATCH /settings/modules` (super_admin).
- **Frontend:** Sidebar filtra itens por `canAccessModule(moduleSlug)`; página Configurações → Módulos (super_admin) com checkboxes por role; páginas protegidas com redirect para `/403`.
- **Doc:** seção MODULOS_DASHBOARD (neste arquivo).

#### 4. **Logout e URL de saída**

- **Frontend:** `getHostedUiLogoutUrl()` redireciona para `/login` após logout no Cognito.
- **Cognito:** Para evitar tela "Invalid request", adicionar `http://localhost:3000/login` (e URL de produção) em **Sign out URL(s)** do App Client (Hosted UI).
- **Doc:** seção TOKEN_STORAGE (neste arquivo) atualizado com passos no AWS Console.

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

# 📅 LOGIN E DEPLOY EM PRODUÇÃO — RESUMO E CHECKLIST (Fev 2026)

> Tudo que foi tentado e o que conferir no servidor. Não criar outros .md de resumo.

## O que foi pedido

Resolver o login em produção: entrar e ir para o dashboard, sem voltar para a tela de login e sem 502.

## O que foi tentado

| Problema | O que fizemos |
|----------|----------------|
| **502 no callback** | Nginx: `proxy_buffer_size 16k` e `proxy_buffers 4 16k` em `location ^~ /api/auth/` (resposta com 3 cookies JWT é grande; sem isso: "upstream sent too big header"). |
| **Volta para login** | Cookie `domain: ".bostoncitygroup.biz"` para www/new/apex; form POST em vez de fetch; por fim: **duas respostas** — POST só 302 para `/api/auth/set-cookies?t=KEY&next=/dashboard`, e GET set-cookies devolve 302 + Set-Cookie para /dashboard (evita 302+Set-Cookie na mesma resposta do POST, que alguns proxies tratam mal). |
| **GET perdia o code** | Fluxo GET direto (Cognito → /api/auth/callback) foi revertido; proxy/CloudFront cortava a query string. Mantido fluxo POST (página /auth/callback + form). |
| **Subdomínio new** | Inclusão de `https://new.bostoncitygroup.biz/auth/callback` no Cognito e cookies com domain para subdomínios. |

## Fluxo atual (duas respostas)

1. Cognito redireciona para `/auth/callback?code=xxx&state=/dashboard`.
2. Página envia **form POST** para `/api/auth/callback` (code no body).
3. Callback troca o code por tokens, guarda em memória com uma chave, e responde **só 302** para `/api/auth/set-cookies?t=KEY&next=/dashboard` (sem Set-Cookie).
4. O browser segue para GET `/api/auth/set-cookies?t=...`. Essa rota devolve **302 + Set-Cookie** para `/dashboard`.
5. O browser define os cookies e segue para `/dashboard`; o próximo request já vai com cookies.

## Checklist no servidor

**1. Nginx** — Em `location ^~ /api/auth/` (blocos 80 e 443): `proxy_buffer_size 16k;` e `proxy_buffers 4 16k;`. **Obrigatório:** `location ^~ /api/public/` deve ir para 3000 (Next), senão `/api/public/group` retorna 404 e a página de login quebra (session_expired). Testar: `sudo nginx -t`. Recarregar: `sudo systemctl reload nginx`. Ver `docs/nginx-bostoncitygroup.biz.example.conf`.

**2. Cognito** — Allowed callback URLs: `https://www.bostoncitygroup.biz/auth/callback`, `https://bostoncitygroup.biz/auth/callback`, `https://new.bostoncitygroup.biz/auth/callback`.

**3. Env Next (apps/web)** — `NEXT_PUBLIC_APP_URL` (URL canônica), `COGNITO_DOMAIN` ou `NEXT_PUBLIC_COGNITO_DOMAIN`, `COGNITO_CLIENT_ID` ou `NEXT_PUBLIC_COGNITO_CLIENT_ID`.

**4. Deploy** — `cd ~/bcg-site && git pull origin develop && ./deploy.sh`. Depois limpar cookies ou aba anônima.

**Se ainda falhar:** `pm2 logs bcg-web --lines 50`; conferir se POST retorna 302 para `/api/auth/set-cookies?t=...`; se houver CloudFront, desabilitar cache para `/api/auth/*` e invalidar.

---

# DOCS CONSOLIDADOS (conteúdo dos .md)

> Todo o conteúdo que estava em arquivos .md separados em docs/ foi reunido aqui. Não criar novos .md de resumo.

## MODULOS_SIDEBAR_DESENHO (Desenho da sidebar por módulos — produção segura)

**Contexto:** Reorganizar o menu do dashboard em áreas (Adm, Futebol, Sócio Torcedor, Marketing, etc.) sem quebrar produção. Todas as URLs atuais continuam funcionando; nenhum slug de módulo existente é alterado no banco.

### Regras para produção

- **URLs:** Nenhuma rota existente é removida nem renomeada. Links antigos (ex.: `/dashboard/cadastros/jogadores`) continuam válidos.
- **Módulos (Module/ModuleRole):** Nenhum slug já usado em permissões ou abas do jogador é alterado (`tipos`, `empresas`, `usuarios`, `medico`, `psicologia`, `diretoria`, `juridico`, etc.).
- **Sidebar:** Apenas reorganização visual (grupos e rótulos). Cada item continua com o mesmo `moduleSlug` e `href` que hoje.
- **Escopo por tenant:** Todos os módulos serão ajustados e separados por empresa/clube; cada menu e dado é filtrado pelo tenant em que o usuário está atuando.

### Árvore desejada do menu (desenho)

**Diretoria** = dashboard gerencial com todas as informações de todas as empresas, exclusivo da diretoria (acima de Empresas). **Empresas** = só esse nome (sem "Negócios"); Listagem + Tipos dentro. **Status** e **Avaliações** (hoje em Diretoria) passam para **Futebol → Análise**. **Relatórios** = novo menu para relatórios do app. Todos os módulos separados por empresa/clube (tenant).

```
Dashboard                    → href: /dashboard              moduleSlug: dashboard
Grupo Master                 → href: /dashboard/grupo        moduleSlug: grupo_master

Diretoria (grupo — exclusivo diretoria; dashboard gerencial)
├── Dashboard gerencial      → /dashboard/diretoria          diretoria
│   (visão de todas as empresas/clubes do grupo)
└── (outros itens exclusivos da diretoria)

Empresas (grupo colapsável — estrutura: empresas/clubes do grupo)
├── Listagem                 → /dashboard/empresas           empresas
└── Tipos de Negócios        → /dashboard/cadastros/tipos    tipos

Adm (grupo colapsável — departamento administrativo)
├── Financeiro               → /dashboard/adm/financeiro     adm_financeiro   [NOVO – fase 3]
├── Compras                  → /dashboard/adm/compras       adm_compras      [NOVO – fase 3]
├── RH                       → /dashboard/adm/rh            adm_rh           [NOVO – fase 3]
├── Patrimônio               → /dashboard/adm/patrimonio    adm_patrimonio   [NOVO – fase 3]
├── Nutrição                 → /dashboard/adm/nutricao      adm_nutricao     [NOVO – fase 3]
└── Estoque                  → /dashboard/adm/estoque       adm_estoque      [NOVO – fase 3]

Futebol (grupo colapsável)
├── Categorias               → /dashboard/cadastros/categorias    tipos
├── Campeonatos              → /dashboard/cadastros/campeonatos   tipos
├── Estádios                 → /dashboard/cadastros/estadios     tipos
├── Times adversários        → /dashboard/cadastros/times         tipos
├── Atletas                → /dashboard/cadastros/jogadores     tipos
├── Comissão técnica         → /dashboard/futebol/comissao        futebol_comissao [NOVO – fase 3]
│   (técnicos, assistentes, etc.)
├── Fisiologia               → /dashboard/futebol/fisiologia  futebol_fisiologia [NOVO – fase 3]
└── Análise (subgrupo)
    ├── Avaliações            → (aba do jogador + listagem)  diretoria
    ├── Status                → (aba do jogador + listagem)  diretoria
    └── Desempenho            → /dashboard/futebol/analise    futebol_analise   [NOVO – fase 3]

Médico (módulo transversal)
└── Histórico médico         → /dashboard/medico             medico

Psicologia (módulo transversal)
├── Avaliação psicológica    → (dentro do jogador; aba)      psicologia
└── Consultas                → /dashboard/consultas           psicologia

Jurídico (módulo transversal)
└── Contratos / Documentos   → (dentro do jogador; aba + lista)   juridico

Sócio Torcedor (grupo – fase 3)
└── (a definir: Ingressos, Benefícios, Cadastro)  slugs: socio_*   [NOVO]

Marketing (grupo – fase 3)
└── (a definir: Campanhas, Redes; ou agrupar Notícias/Mídia)  [NOVO]

Relatórios (grupo colapsável)
└── (relatórios do app)      → /dashboard/relatorios/*       relatorios [NOVO]

Ferramentas (grupo colapsável)
├── Emails                   → /dashboard/emails            emails
├── Senhas                   → /dashboard/senhas             vault
├── Páginas                  → /dashboard/paginas            paginas
├── Notícias                 → /dashboard/noticias          noticias
└── Mídia                    → /dashboard/midia              midia

Configurações                → /dashboard/configuracoes       configuracoes
├── Usuários                 → /dashboard/usuarios           usuarios
```

### Mapeamento: item atual → nova localização

| Hoje (menu)           | Nova localização (grupo) | href (mantido?)     | moduleSlug (mantido?) |
|-----------------------|---------------------------|---------------------|------------------------|
| Cadastros → Usuários  | **Configurações** → Usuários | /dashboard/usuarios | usuarios               |
| Cadastros → Empresas  | **Empresas** (Listagem + Tipos) | /dashboard/empresas, /dashboard/cadastros/tipos | empresas, tipos |
| Cadastros → Clubes    | Futebol                   | /dashboard/cadastros/* | tipos (todos)      |
| (não existe)          | **Diretoria** (dashboard gerencial) | /dashboard/diretoria | diretoria        |
| (não existe)          | **Futebol** → Comissão técnica, Análise (Avaliações, Status) | /dashboard/futebol/* | futebol_*, diretoria |
| (não existe)          | **Relatórios**            | /dashboard/relatorios/* | relatorios [NOVO]  |
| (não existe)          | **Adm** (só depto. adm)   | /dashboard/adm/*    | adm_* (novos – fase 3) |
| (não existe na sidebar)| Médico                    | /dashboard/medico   | medico (já existe)     |
| (não existe na sidebar)| Psicologia                | /dashboard/consultas | psicologia (já existe) |
| (não existe na sidebar)| Jurídico                  | abas do jogador     | juridico               |
| Abas Avaliações/Status | **Futebol → Análise** (menu); permissão continua `diretoria` | — | diretoria        |
| Emails, Senhas, Páginas, Notícias, Mídia | **Ferramentas** (submenu) | mesmos hrefs | mesmos slugs           |

**Resumo:** **Diretoria** acima de Empresas; dashboard gerencial com visão de todas as empresas. **Empresas** = só esse nome (Listagem + Tipos). **Futebol** inclui Comissão técnica e Análise (Avaliações, Status, Desempenho). **Relatórios** = novo menu. Todos os módulos separados por empresa/clube.

### Fases de implementação (seguro para produção)

**Fase 1 — Só reorganização (zero risco):**
- Alterar apenas `dashboard-menu.config.ts`: o grupo "Cadastros" vira **Empresas** (Listagem + Tipos — sem nome "Negócios") e **Futebol** (Categorias, …, Jogadores). **Diretoria** vira grupo no topo (acima de Empresas) com link para dashboard gerencial. **Usuários** dentro de **Configurações**. **Emails, Senhas, Páginas, Notícias, Mídia** dentro de **Ferramentas**. **Mantendo todos os href e moduleSlug atuais**.
- Atualizar `sidebar.tsx` para: Diretoria (acima), Empresas, Futebol, Ferramentas, Configurações (com Usuários). Lógica de `canAccessModule` e rotas permanece idêntica.
- **Não** criar novos módulos no banco; **não** criar novas rotas. URLs continuam iguais.
- Resultado: usuário vê "Diretoria", "Empresas", "Futebol", "Ferramentas", "Configurações". Nada quebra.

**Fase 2 — Módulos transversais e Diretoria/Relatórios:**
- Adicionar itens de primeiro nível: **Médico**, **Psicologia**, **Jurídico**. **Diretoria** já no topo (Fase 1) com dashboard gerencial. **Relatórios** como grupo (menu) com rotas futuras.
- Módulos `medico`, `psicologia`, `juridico`, `diretoria` já existem no banco — só exibir na sidebar para quem tem acesso. Avaliações e Status no jogador continuam com permissão `diretoria`; no menu aparecem em **Futebol → Análise**.

**Fase 3 — Novos módulos e rotas (incremental):**
- Criar no banco novos Module: **Adm** (`adm_financeiro`, `adm_compras`, `adm_rh`, …), **Futebol** (`futebol_comissao`, `futebol_fisiologia`, `futebol_analise`), **Relatórios** (`relatorios`), Sócio Torcedor, Marketing.
- Rotas: `/dashboard/adm/*`, `/dashboard/futebol/*` (incl. Comissão técnica e Análise com Avaliações/Status), `/dashboard/relatorios/*`. Todos os módulos separados por empresa/clube.

### Abas do jogador

**Avaliações** e **Status** continuam com `moduleSlug: diretoria` (quem tem acesso à diretoria vê). No **menu** da sidebar ficam em **Futebol → Análise**. Demais abas inalteradas; filtro por `canAccessModule(tab.moduleSlug)`.

### Resumo

- **Escopo:** Todos os módulos ajustados e separados por empresa/clube (tenant).
- **Diretoria** = acima de Empresas; dashboard gerencial com todas as informações de todas as empresas, exclusivo da diretoria. Não é mais o menu de "Avaliações/Status" — esses vão para Futebol → Análise.
- **Empresas** = só esse nome (sem "Negócios"): Listagem + Tipos de Negócios.
- **Adm** = departamento administrativo (Financeiro, Compras, RH, Patrimônio, Nutrição, Estoque).
- **Futebol** = Categorias, Campeonatos, Estádios, Times, Atletas, **Comissão técnica** (técnicos, assistentes), Fisiologia, **Análise** (Avaliações, Status, Desempenho — Avaliações e Status continuam com permissão `diretoria`).
- **Relatórios** = novo menu para relatórios do app.
- **Ferramentas** = Emails, Senhas, Páginas, Notícias, Mídia.
- **Configurações** = Usuários (submenu) + telas atuais.
- **Fase 1:** Diretoria (topo), Empresas, Futebol, Ferramentas, Configurações. Deploy seguro.
- **Fase 2:** Médico, Psicologia, Jurídico, Relatórios (menu).
- **Fase 3:** Adm, Futebol (Comissão técnica, Fisiologia, Análise), Relatórios (rotas), Sócio Torcedor, Marketing.

## DEPLOY-SERVER (Deploy no servidor — AWS Lightsail / Ubuntu)

Passo a passo para rodar o projeto no servidor com **PM2**. Pressupõe: Node.js, pnpm, Git e PM2 instalados; PostgreSQL rodando (no mesmo servidor ou em 127.0.0.1).

**1. Variáveis de ambiente** — Crie/edite `.env` em `apps/api` (e `apps/web` se precisar). Use `DATABASE_URL` com **127.0.0.1** (não localhost) e `&options=-c%20client_encoding%3DUTF8`. **2. Atualizar código:** `cd ~/bcg-site && git pull origin develop && pnpm install`. **3. API:** `cd apps/api && pnpm exec prisma generate && pnpm run build`; PM2: `pm2 start dist/main.js --name api` (ou `pm2 restart api`). **4. Web:** `cd apps/web && pnpm run build`; PM2: `pm2 start pnpm --name web -- start` (ou `pm2 restart web`). **5. Script único:** `./deploy.sh` na raiz (git pull, pnpm install, build API e Web, pm2 restart). **6. Nginx:** `location ^~ /api/auth/` deve ir para porta 3000 (Next) com `proxy_buffer_size 16k; proxy_buffers 4 16k;`. **7. Checklist:** NODE_ENV, DATABASE_URL 127.0.0.1, Prisma generate antes do build, PM2 api e web, portas e Nginx. **8. Erros comuns:** Prisma 6 (não 7), CRLF→LF, acentuação→fix:encoding e options na URL.

## PM2_STARTUP (API/Web não sobem após reboot — configurar uma vez)

O PM2 **não inicia os processos automaticamente** após reboot. É preciso configurar o startup **uma vez** no servidor:

```bash
pm2 startup
```

O comando exibirá uma linha como `sudo env PATH=... pm2 startup systemd -u ubuntu --hp /home/ubuntu`. **Copie e execute essa linha** (com sudo). Depois:

```bash
pm2 save
```

A partir daí, após cada reboot o PM2 subirá sozinho e restaurará bcg-api e bcg-web. O `deploy.sh` já chama `pm2 save` ao final.

**Se a API não subiu após o reboot:** rode `./deploy.sh` manualmente (ou `pm2 resurrect` se o PM2 já estiver rodando mas os processos não).

## SERVER_REBOOT (System restart required)

Quando o Ubuntu mostrar **"*** System restart required ***"** no login (após updates de kernel, etc.):

```bash
sudo reboot
```

Após o reboot, reconectar via SSH. **Se PM2 startup foi configurado** (ver PM2_STARTUP acima), bcg-api e bcg-web já estarão rodando. Caso contrário, rodar: `cd ~/bcg-site && git pull origin develop && ./deploy.sh`.

## SERVER_500_ERRO_AO_CONECTAR (Login 500 / "Erro ao conectar" no servidor)

Quando o dashboard ou o login retornam **500** ou **"Erro ao conectar. Tente novamente."**, a causa é quase sempre: **API Nest (bcg-api) não está respondendo** (crashed no bootstrap ou não subiu). No servidor Ubuntu, rode na ordem:

1. **Diagnóstico:** `cd ~/bcg-site && bash scripts/check-env-server.sh` — confere .env (DATABASE_URL, JWT_SECRET), se GET /group responde 200 e se PM2 está com bcg-api/bcg-web online.
2. **Atualizar e subir:** `git pull origin develop && ./deploy.sh` — puxa o código (incl. fix de dependência circular Auth/Modules), instala deps, build API e Web, reinicia PM2.
3. **Se bcg-api continuar em erro:** `pm2 logs bcg-api --lines 80 --nostream` — se aparecer `UndefinedModuleException` ou "ModulesModule imports undefined", o deploy não pegou (rode de novo o passo 2). Se aparecer erro de **banco** (connection refused, P1001): PostgreSQL deve estar rodando; confira `DATABASE_URL` em `apps/api/.env` (127.0.0.1).
4. **Testar API direto:** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/group` — deve retornar **200**. Se retornar 000, a API não está escutando.
5. **Primeira vez no servidor:** Se nunca rodou migrations: `cd apps/api && pnpm exec prisma migrate deploy`. Opcional: `pnpm run seed:local-user` para usuário rl@bostoncitygroup.biz.

Depois disso, acesse de novo o site e tente o login. O cookie `access_token` (JWT nosso) é definido pelo Next após POST no Nest `/internal/auth/login`.

## CLOUDFRONT_403_REDIRECT_LOOP (403 "request method" / "only cachable" / ERR_TOO_MANY_REDIRECTS)

Se o site passa por **CloudFront** e você vê **403** ("This distribution is not configured to allow the HTTP request method" / "supports only cachable requests") ou **ERR_TOO_MANY_REDIRECTS** no /dashboard ou /login:

1. **Permitir POST (e outros métodos)** — No CloudFront, edite o **Cache behavior** que atende o site (ex.: Default ou o que usa o origin Lightsail). Em **Allowed HTTP Methods** escolha **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE** (não use só "GET, HEAD, OPTIONS").
2. **403 mesmo com PATCH já permitido (ex.: PATCH /api/group "Erro ao salvar")** — (a) **WAF:** se a distribuição tem Web ACL (WAF), pode estar bloqueando: Console → WAF & Shield → Web ACLs → regras que bloqueiam body ou método; criar exceção para path `/api/*` ou aumentar tamanho de body permitido. (b) **Behavior para /api/***: criar Cache behavior com path pattern **`/api/*`**, **Cache policy = CachingDisabled**, **Origin request policy** = AllViewer (ou que encaminhe All headers + body), **Allowed HTTP Methods** = GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE; ordem **antes** do Default. (c) **Invalidation:** usar path **`/*`** (não só `/`) e aguardar concluir.
3. **Não cachear login e API auth** — Crie um **Cache behavior** com path pattern `/api/auth/*` e `/login` (ou dois behaviors), com **Cache policy** = CachingDisabled (ou "No cache"). Ordem: esses behaviors **antes** do Default, para ter prioridade. Assim POST /api/auth/login e GET /login não são cacheados e o método POST é repassado ao origin.
4. **Não cachear /dashboard** — Crie um behavior com path pattern **`/dashboard`** (ou **`/dashboard/*`**), origin = mesmo do site (ec2-bcg-web), **Cache policy = CachingDisabled**. Coloque **antes** do Default. Assim o 302 de /dashboard → /login nunca é cacheado e o loop para.
5. **Invalidar cache** — Depois de alterar: Create invalidation com `/*` para limpar cache antigo.
6. **Cookies** — Garanta que a policy de cache (ou "Forward cookies") encaminha os cookies ao origin quando necessário (para /api/* e /login), para o redirect pós-login funcionar.
7. **302 com Location igual à URL (redirect para si mesmo)** — Se `curl -I https://www.bostoncitygroup.biz/dashboard` retorna **302** com **Location: https://www.bostoncitygroup.biz/dashboard** (mesma URL), é conflito de trailing slash (CloudFront/Nginx enviam `/dashboard/`, Next.js redireciona para `/dashboard`). **Soluções:** (a) `skipTrailingSlashRedirect: true` em `next.config.ts`; (b) middleware faz **rewrite** `/path/` → `/path` (sem redirect) antes do Next.js processar. Deploy e invalidar cache CloudFront.
8. **Diagnóstico no servidor** — Para isolar origem do 302: `curl -I -H "Host: www.bostoncitygroup.biz" -H "X-Forwarded-Proto: https" http://127.0.0.1:3000/dashboard` (bypass Nginx). Se 302 → Next.js; se 200 → Nginx/CloudFront. Verificar header `X-Middleware-Auth` na resposta (confirma versão do middleware).

Se não usar CloudFront (acesso direto ao Lightsail/Nginx), o 403 e o redirect loop não vêm do CloudFront; confira Nginx e o deploy (middleware usando origem pública).

## TOKEN_STORAGE (Token storage — Fase 2)

Tokens em **HTTP-only cookies** (id_token, access_token, refresh_token). Definidos em `apps/web/src/app/api/auth/callback` (e set-cookies). Recuperar no servidor: `request.cookies.get('access_token')?.value`; no frontend usar `/api/me` com `credentials: 'include'`. Renovação: scope `offline_access`, rota `POST /api/auth/refresh`, usar `authFetch` em chamadas autenticadas. Logout: link para Cognito com `logout_uri` = nossa tela `/login`; cadastrar Sign out URL(s) no App Client. Allowed callback URLs: incluir exatamente as URLs de callback (localhost e produção). Scopes: OpenID e offline_access. NEXT_PUBLIC_APP_URL = URL canônica.

## REGRAS_DIARIAS

**Ver seção "⭐ REGRAS DIÁRIAS (LER PRIMEIRO)" no topo deste arquivo.**

## ENCODING_UTF8_FIX

Acentuação corrompida (Mojibake): buscar dados da Home no servidor (RSC) direto do backend (fetch 127.0.0.1:3001), sem fetch no cliente para carregamento inicial. Arquivos: home-content.ts (fetchGroupHomeFromBackend), page.tsx (Server Component), HomeClient (recebe props). Nginx alternativo: charset utf-8; proxy_set_header Accept-Charset "utf-8".

## PARA-O-CHATGPT

Prisma 6 (não 7), DATABASE_URL com 127.0.0.1 em produção, arquivos LF (não CRLF), prisma e @prisma/client mesma versão. Ao sugerir código para PrismaService/deploy: Prisma 6, url = env("DATABASE_URL"), super({ log: [...] }), 127.0.0.1.

## BUILD_E_DEPLOY_WEB

`pnpm install` (raiz); `pnpm --filter web build`; `pnpm --filter web start -- --port 3000`. PM2: working directory raiz do monorepo. Lockfile só na raiz. Erros de runtime em "Generating static pages" são esperados se APIs indisponíveis no build.

## CURSOR_EVITAR_OOM

Abrir um projeto por vez. NODE_OPTIONS=--max-old-space-size=8192 (ou 16384) em variáveis de ambiente do sistema. Ao reabrir após OOM: "Don't restore editors". Opção B: script cursor-launch-com-mais-memoria.bat.

## S3_BUCKET_POLICY

Bucket bcg-platform-assets: leitura pública em `logos/*` e `media/*` via bucket policy (GetObject, Principal *). Desbloquear "Block public access" se necessário. URLs: logos em logos/group e logos/tenants/{id}; mídia em media/{sizeKey}/.

## PAGINAS_E_SUBDOMINIOS

Criar página: Dashboard → Empresas → Páginas → Construtor com módulos. Ver em dev: /portfolio/[slug]. Subdomínio AWS: CNAME para o app; backend/front identificam tenant pelo hostname.

## NPM_VS_PNPM

Monorepo usa **pnpm**. Na raiz: `pnpm install`. Não rodar npm install em apps/api. Para adicionar pacote: `pnpm add <pkg> --filter api` (ou web).

## PLANILHA_TIMES_CATEGORIAS_GOOGLE_SHEETS

Congelar primeira linha. Validação de dados: dropdowns para categoria (principal, sub20, ...), posição (GK, CB, ...), pe_dominante (Esquerdo, Direito, Ambos). Aba Opções com listas. Formatação: cabeçalho negrito, colunas largas.

## MODULOS_PAGINA (resumo)

Imagens: Dashboard → Mídia, placeholders com tamanho, dropdown da mídia. Padrão: backgroundColor, backgroundOverlayOpacity, titlePt/titleEn. Hero: múltiplas fotos, carrossel (fade/slide/zoom), intervalo configurável, título por foto. Header/Footer: módulos dedicados. Ordem dos blocos definida pelo usuário.

## MODULOS_DASHBOARD

Configurações → Módulos: super admin define acesso por módulo (Company Admin, Editor). Novo módulo: INSERT em Module e ModuleRole; migration ou seed; item na sidebar com moduleSlug; página com canAccessModule("slug").

## FOOTBALL_DATA_SETUP

Cadastro em football-data.org; FOOTBALL_DATA_API_KEY no .env da API. Team ID na cobertura da API. Empresas → [clube] → Football-Data Team ID; Páginas → módulo Próximos jogos → Fonte AUTO. Limite: 10 req/min, cache 10 min.

## CURSOR_CONFIG_ESTABILIDADE

Abrir só o projeto do dia. files.exclude e search.exclude para node_modules, dist, .next. Reduz indexação e memória.

## AWS_CREDENTIALS

API usa AWS SDK (Cognito Admin). Credenciais: default chain ou AWS_ACCESS_KEY_ID/SECRET no .env. Dev: aws configure --profile bcg-dev e AWS_PROFILE no .env. IAM policy mínima para User Pool. Nunca commitar .env.

## PARTE_3_ESCOPO_E_PACIENTES (Planejamento — escopo usuário, pacientes, listas, ADM)

**Contexto:** Profissionalizar o app: tratar "jogadores" como **Atletas** na interface; estender Médico, Psicologia e Jurídico (e futuramente ADM) para **todo o grupo** — não só futebol. As listas não podem ter "cara de lista de atletas": devem servir a **pacientes** (atletas + comissão técnica + funcionários) em todas as empresas/clubes do grupo. Ao fazer o ADM, incluir **cadastro de funcionários** (e comissão); não pode ser só futebol.

### 1. Escopo do usuário (quais empresas/clubes ele vê)

- **Objetivo:** No cadastro de usuário, definir **quais empresas/clubes** ele pode acessar. Ex.: João vê só um clube; Maria vê dois; super_admin e diretores veem todos.
- **Modelo de dados:** Criar relação User ↔ Tenant (ex.: tabela `UserTenantScope` ou `Membership`: `userId`, `tenantId`). Super_admin e roles de diretoria podem ter regra especial: "acesso a todos" (sem filtro por tenant).
- **API:** Endpoints para ler/gravar tenants permitidos por usuário; em todas as listagens filtrar pelos tenants do usuário; super_admin/diretoria sem filtro.
- **Frontend:** No formulário de usuário (novo/editar), multi-select de empresas/clubes. Ao selecionar uma empresa/clube no dashboard, exibir só as informações dessa entidade.

### 2. Pacientes: modelo de dados (grupo inteiro)

- **Decisão:** Estender a tabela **Player** (já usada por Médico, Psicologia, Jurídico) em vez de criar entidade separada. Assim histórico médico, avaliações, consultas e documentos jurídicos continuam no mesmo registro.
- **Campos a adicionar:**
  - **personType** (`String`, default `'atleta'`): `'atleta'` | `'comissao'` | `'funcionario'`. Define se a pessoa é atleta, comissão técnica ou funcionário.
  - **role** ou **cargo** (`String?`): para comissão e funcionários — ex.: "Técnico", "Assistente", "Administrativo". Para atleta pode ficar null (usa-se `position`).
- **Comportamento:** Para `personType = 'atleta'`: mantém `category`, `position`, `jerseyNumber` etc. (sync da planilha e CRUD atual). Para `comissao` e `funcionario`: `category` e `position` ficam null; opcionalmente preencher `role`/`cargo`. Todos têm `tenantId` (empresa ou clube do grupo).
- **Cadastro:**
  - **Atletas:** continuam sendo cadastrados em **Futebol → Atletas** (e sync da planilha); todos com `personType = 'atleta'`.
  - **Funcionários e comissão:** cadastrados no **ADM** (quando existir): "Cadastro de funcionários" e "Comissão técnica" criam registros com `personType = 'funcionario'` ou `'comissao'`, vinculados a um tenant. O mesmo registro aparece nas listas de Médico, Psicologia e Jurídico — não fica "cara de lista só de atletas".

### 3. Listas (Médico, Psicologia, Jurídico): ajuste para não parecer só atletas

- **Filtros atuais:** Hoje: **Clube** (tenantId) + **Categoria** (principal, sub20, etc.) + busca por nome. Isso é 100% futebol.
- **Filtros desejados (grupo inteiro):**
  1. **Empresa/Clube** — mesmo que hoje, mas rótulo "Empresa/Clube" e listar **todos os tenants** (clubes e empresas). Continua um único dropdown.
  2. **Tipo de pessoa** — novo: **Todos** | **Atleta** | **Comissão técnica** | **Funcionário**. Quando "Atleta", mostrar também o filtro **Categoria** (principal, sub20, …). Quando "Comissão" ou "Funcionário", o filtro Categoria fica oculto ou desconsiderado.
  3. **Busca (nome)** — mantida.
- **Tabela (colunas):**
  - Foto, **Nome**, **Empresa/Clube** (em vez de só "Clube"), **Tipo** (Atleta / Comissão técnica / Funcionário).
  - Para **Atleta:** exibir **Categoria** e **Posição** (como hoje).
  - Para **Comissão/Funcionário:** exibir **Cargo** (campo `role`/`cargo`) ou "—" se vazio.
  - Última coluna: link para Histórico médico / Avaliação e consultas / Documentos (conforme a tela).
- **Textos da página:** Título do card pode ser "Pacientes" (ou "Atletas e demais pacientes") em vez de só "Atletas"; descrição: "Clique em uma pessoa para ver histórico médico" (ou equivalente). Assim a lista fica clara para todo o grupo.

### 4. ADM: cadastro de funcionários (e comissão)

- **Objetivo:** Quando implementar o módulo ADM, incluir **cadastro de funcionários** (e depois comissão técnica). Não pode ser só futebol — tem que ser pacientes (pessoas vinculadas a empresas/clubes do grupo).
- **Fluxo:** Tela no ADM para criar/editar "Funcionário" ou "Comissão técnica": seleciona **Empresa/Clube** (tenant), **Nome**, **Cargo**/função, foto opcional. No backend, cria/atualiza registro na mesma tabela Player com `personType = 'funcionario'` ou `'comissao'`. Esses registros passam a aparecer nas listas de Médico, Psicologia e Jurídico (filtro por tipo).
- **Futebol → Atletas:** Pode continuar listando só `personType = 'atleta'` (filtro fixo ou default), para não misturar com funcionários na tela de cadastro de atletas. Sync da planilha continua criando apenas atletas.

### 5. Resumo e etapas de implementação

| Item | Ação |
|------|------|
| **Schema** | Migration: adicionar em `Player`: `personType String @default("atleta")`, `role String?` (ou `cargo`). |
| **API** | `GET /players`: aceitar query `personType` (atleta \| comissao \| funcionario). Create/update: aceitar `personType` e `role`. `findAll` filtrar por `personType` quando informado. |
| **Médico / Psicologia / Jurídico** | Filtros: label "Empresa/Clube"; novo dropdown "Tipo de pessoa" (Todos, Atleta, Comissão técnica, Funcionário); Categoria só quando Tipo = Atleta (ou Todos). Tabela: coluna "Tipo"; coluna "Categoria" ou "Cargo" conforme o tipo. Textos: "Pacientes" / "atletas e demais pacientes". |
| **Futebol → Atletas** | Listagem e sync continuam só para atletas (filtro `personType = 'atleta'` ou não enviar personType e default no backend para atleta nas rotas de cadastros/jogadores). |
| **ADM (fase 3)** | Ao criar o módulo ADM: tela "Cadastro de funcionários" (e depois "Comissão técnica") que cria registros com `personType = funcionario`/`comissao`; mesma base (Player) para aparecer em Médico, Psicologia, Jurídico. |
| **Escopo usuário** | Ver item 1; implementar em paralelo ou após as listas de pacientes. |

---

## FASE2_ENTREGAVEIS / prd_site_bcg

Ver arquivos no repo se necessário; conteúdo de produto e entregáveis mantido nos respectivos documentos originais quando existirem.

## NOTICIAS_IMAGE_PROXY_LAMBDA (Proxy de imagens Instagram via AWS Lambda)

Imagens do feed (Instagram) podem dar 403 no proxy interno. **NOTICIAS_IMAGE_PROXY_URL** (server-side): quando definido, URLs do Instagram passam por esse proxy. Formato: `https://xxx.lambda-url.region.on.aws` (sem barra final). **Importante:** URLs relativas (/api/public/noticias-image) e Lambda (https://) NÃO devem passar por getPublicImageUrl — senão em local as imagens vão para bostoncitygroup.biz em vez de localhost. GaleriaSection e NoticiasSection usam a URL direta para proxy/Lambda. **Deploy Lambda:** (1) Console AWS Lambda → Node.js 20.x, sem VPC. (2) Upload `scripts/aws-lambda-image-proxy/index.mjs`; handler `index.handler`. (3) Function URL, Auth NONE. (4) Copiar URL.

## GOOGLE_MEET_CALENDAR (Criar eventos com link Meet)

Usar o **mesmo projeto** do YouTube no Google Cloud. **1. Ativar API:** APIs e serviços → Biblioteca → "Google Calendar API" → Ativar. **2. Service Account:** Credenciais → Criar credenciais → Conta de serviço (nome ex.: bcg-calendar-meet). **3. Chave JSON:** Na conta de serviço, aba Chaves → Adicionar chave → JSON. **4. Calendário:** calendar.google.com → compartilhar calendário com o email da Service Account, permissão "Faça alterações nos eventos". **5. .env API:** GOOGLE_CALENDAR_CLIENT_EMAIL, GOOGLE_CALENDAR_PRIVATE_KEY, GOOGLE_CALENDAR_ID. **6. Impersonation (OBRIGATÓRIO para Meet):** Service Account sozinha não consegue criar links Meet. Adicione GOOGLE_CALENDAR_IMPERSONATE_EMAIL com o email do dono do calendário (ex.: user@empresa.com). Requer **domain-wide delegation** no Admin do Workspace: Security → API Controls → Domain-wide delegation → adicionar Client ID da Service Account com scope https://www.googleapis.com/auth/calendar.

## CONTROLE_JURIDICO_HELLOSIGN (Assinatura eletrônica — Jogadores)

Aba "Controle Jurídico" no cadastro do jogador. Upload PDF → envio para assinatura via **HelloSign** (Dropbox Sign). **1. Conta:** hellosign.com, plano free (3 docs/mês). **2. API Key:** Settings → API → copiar API Key. **3. .env API:** HELLOSIGN_API_KEY=sua_chave. Opcional: HELLOSIGN_TEST_MODE=true (testes sem consumir cota). **4. Deploy:** git pull, pnpm install, pnpm build, reiniciar API. S3: PDFs em legal/{playerId}/ (mesmo bucket de mídia). **5. Módulo:** Configurações → Módulos → habilitar "juridico" para company_admin, diretoria. super_admin vê tudo sem habilitar. **6. Assinatura:** campo posicionado no rodapé da página 1; ao enviar, prompt permite escolher página (1, 2, etc.).

---
