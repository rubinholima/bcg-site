# 📘 DESENVOLVIMENTO DIÁRIO — BCG PLATFORM

> **Este arquivo concentra TODO o histórico diário do projeto.**
> **NUNCA** criar outros arquivos de resumo.
> Atualizar **somente no FIM DO DIA**.

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
