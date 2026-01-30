# Fase 2 — Portal público + Dash privado (Superadmin/Admin) + Sync /me

## Checklist final

- [x] Login continua funcionando (Cognito Hosted UI, callback, cookies).
- [x] GET /me retorna 200 e faz upsert do User no Prisma.
- [x] Usuário admin/super_admin acessa /dashboard normalmente.
- [x] Usuário role="user" NÃO acessa /dashboard (redireciona para "/").
- [x] Portal público (/, /403) funciona sem login.
- [x] Sem chamadas fetch/axios para cognito-idp no browser.
- [x] Token storage documentado (HTTP-only cookies; ver `docs/TOKEN_STORAGE.md`).

---

## Arquivos criados

### Backend (apps/api)

| Arquivo | Descrição |
|--------|-----------|
| `src/auth/jwt-auth.guard.ts` | Guard que valida JWT com JWKS Cognito (iss, exp, aud/client_id, token_use). |
| `src/auth/me.controller.ts` | GET /me (autenticado); extrai claims, deriva role, chama MeService. |
| `src/auth/me.service.ts` | Upsert User por cognitoSub (criar/atualizar email, name). |
| `src/auth/auth.module.ts` | Módulo Auth (MeController, MeService). |
| `prisma/migrations/20260130000000_add_user_cognito_fields/migration.sql` | Adiciona cognitoSub e name à tabela User. |

### Frontend (apps/web)

| Arquivo | Descrição |
|--------|-----------|
| `src/app/api/me/route.ts` | Proxy GET /api/me: lê cookie, chama backend GET /me com Bearer. |
| `src/context/AuthContext.tsx` | AuthProvider: chama /api/me, expõe user, groups, role, canAccessDashboard. |
| `src/types/auth.ts` | Tipos MeUser, MeResponse. |
| `src/components/auth/DashboardGuard.tsx` | Guard: sem login → /login; role user → /. |
| `src/components/layout/LayoutWithNav.tsx` | Navbar portal (Início, Dashboard se canAccessDashboard, Entrar). |
| `src/app/403/page.tsx` | Página "Acesso negado". |

### Docs

| Arquivo | Descrição |
|--------|-----------|
| `docs/TOKEN_STORAGE.md` | Onde os tokens ficam (cookies) e como recuperar. |
| `docs/FASE2_ENTREGAVEIS.md` | Este arquivo (checklist + comandos). |

---

## Arquivos alterados

### Backend (apps/api)

| Arquivo | Alteração |
|--------|------------|
| `prisma/schema.prisma` | Model User (id, cognitoSub, email, name, createdAt, updatedAt). |
| `package.json` | Deps: jwks-rsa, jsonwebtoken; dev: @types/jsonwebtoken. |
| `src/app.module.ts` | Import AuthModule. |

### Frontend (apps/web)

| Arquivo | Alteração |
|--------|------------|
| `src/app/layout.tsx` | AuthProvider + LayoutWithNav. |
| `src/app/dashboard/layout.tsx` | Envolve conteúdo com DashboardGuard. |

---

## Variáveis de ambiente

### API (apps/api)

- `COGNITO_USER_POOL_ID` — ID do User Pool (ex.: `us-east-1_xxxxx`).
- `COGNITO_CLIENT_ID` — Client ID do app no Cognito (mesmo do frontend).
- `DATABASE_URL` — já existente.

### Web (apps/web)

- Já existentes: `NEXT_PUBLIC_COGNITO_DOMAIN`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`.

---

## Comandos Prisma (não executados automaticamente)

Na pasta **apps/api**:

```bash
# Gerar client após alterações no schema
npx prisma generate

# Aplicar migration (adiciona cognitoSub e name em User)
npx prisma migrate deploy
```

Se a tabela User ainda não existir (nunca rodou a migration `add_user_and_membership`), rode antes as migrations na ordem (init, add_user_and_membership, add_tenant_kind, add_user_cognito_fields) ou use `npx prisma migrate deploy` que aplica todas pendentes.

---

## Regras de acesso

- **Rotas públicas:** "/", "/403", "/login" — acessíveis sem login.
- **Dashboard:** "/dashboard" e "/dashboard/*" — exigem login e role **admin** ou **super_admin**. Role **user** é redirecionado para "/".
- **Menu:** link "Dashboard" no portal só aparece se `canAccessDashboard === true` (admin ou super_admin).

## Cognito: grupos para role

No User Pool do Cognito, use os grupos **super_admin**, **company_admin**, **editor** e **user** (nomes exatos). O endpoint /me deriva:

- `groups` inclui "super_admin" → role = **super_admin**
- senão, "company_admin" → role = **company_admin**
- senão, "editor" → role = **editor**
- senão → role = **user**

**Acesso ao dashboard:** super_admin, company_admin e editor. Role **user** só acessa o portal (sem dashboard).

---

## Módulo Usuários (cadastro + role)

### Conferência — Usuários

- [ ] **API (.env):** `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `AWS_REGION` (opcional; padrão `us-east-1`). Credenciais AWS (variáveis padrão ou IAM role) com permissões Cognito: `ListUsers`, `AdminCreateUser`, `AdminAddUserToGroup`, `AdminRemoveUserFromGroup`, `AdminListGroupsForUser`.
- [ ] **Cognito:** Grupos criados no User Pool com nomes exatos: `super_admin`, `admin`, `user`.
- [ ] **API:** Rotas `GET /users`, `POST /users`, `PATCH /users/:username/role` protegidas por JWT + guard que exige `super_admin` ou `admin`.
- [ ] **Web:** Menu "Usuários" no dashboard; listagem em `/dashboard/usuarios`; novo usuário em `/dashboard/usuarios/new`; alteração de role via select na listagem (chama `PATCH /api/users/[username]/role`).
- [ ] **Proxy:** Frontend chama `/api/users` e `/api/users/[username]/role` (Next.js lê cookie e repassa Bearer ao backend).

### Arquivos do módulo Usuários

| Onde | Arquivo | Descrição |
|------|---------|-----------|
| API | `src/cognito/cognito.service.ts` | ListUsers, AdminCreateUser, setUserRole (add/remove groups). |
| API | `src/cognito/cognito.module.ts` | Exporta CognitoService. |
| API | `src/auth/roles.guard.ts` | DashboardRolesGuard: só super_admin ou admin. |
| API | `src/users/users.controller.ts` | GET/POST /users, PATCH /users/:username/role. |
| API | `src/users/users.service.ts` | Lista (Cognito + DB), create, updateRole. |
| API | `src/users/dto/create-user.dto.ts` | email, name?, temporaryPassword, role. |
| API | `src/users/dto/update-role.dto.ts` | role. |
| Web | `src/app/api/users/route.ts` | Proxy GET/POST /api/users. |
| Web | `src/app/api/users/[username]/role/route.ts` | Proxy PATCH role. |
| Web | `src/app/dashboard/usuarios/page.tsx` | Lista usuários + select para alterar role. |
| Web | `src/app/dashboard/usuarios/new/page.tsx` | Form novo usuário. |
| Web | `src/types/user.ts` | UserListItem, CreateUserBody, UserRole. |
| Web | `src/components/dashboard/sidebar.tsx` | Item "Usuários" com ícone Users. |

### Variáveis de ambiente (API) — usuários

Além das já listadas para JWT:

- `AWS_REGION` — (opcional) Região do User Pool; padrão `us-east-1`. Usada no JWT (JWKS/issuer) e no CognitoService.
- Credenciais AWS: **opcional** no .env. Se não setar `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, o SDK usa a default chain (`AWS_PROFILE`, `aws configure`, IAM role em produção). Ver **`docs/AWS_CREDENTIALS.md`** (DEV local Windows, IAM policy mínima, teste GET /users).
