# WorkMail API – exemplos cURL

Base URL: `http://localhost:3001` (ou a porta configurada em `PORT`).
Todos os endpoints exigem `Authorization: Bearer <JWT>` (token Cognito; roles: super_admin, company_admin ou editor).

Substitua:

- `YOUR_JWT_TOKEN` pelo token JWT (Cognito ID token ou access token)
- `WORKMAIL_ORG_ID` pelo id da organização WorkMail na AWS (ex.: `m-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
- `WORKMAIL_USER_ID` pelo id retornado pela AWS WorkMail (ex.: ao criar conta)
- `DOMAIN` pelo domínio de email (ex.: `bostoncitygroup.com`)

---

### 1) GET /api/workmail/aws-orgs – listar organizações WorkMail na AWS (sem banco)

```bash
curl -s -X GET "http://localhost:3001/api/workmail/aws-orgs" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Resposta esperada: array de `{ workmailOrganizationId, name, state }`.

---

### 2) GET /api/workmail/orgs – listar empresas do banco (id, name, domain, workmailOrganizationId)

```bash
curl -s -X GET "http://localhost:3001/api/workmail/orgs" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Resposta esperada: array de objetos `{ id, name, domain, workmailOrganizationId }`.

---

### 3) GET /api/workmail/accounts?workmailOrganizationId=... – listar contas WorkMail (sem Tenant)

```bash
curl -s -X GET "http://localhost:3001/api/workmail/accounts?workmailOrganizationId=WORKMAIL_ORG_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Resposta esperada: array de `{ workmailUserId, name, displayName, email, state }`.
Erro 400 se `workmailOrganizationId` ausente.

---

### 4) POST /api/workmail/accounts – criar conta WorkMail (workmailOrganizationId + domain no body)

```bash
curl -s -X POST "http://localhost:3001/api/workmail/accounts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workmailOrganizationId": "WORKMAIL_ORG_ID",
    "domain": "bostoncitygroup.com",
    "localPart": "joao.silva",
    "displayName": "João Silva",
    "initialPassword": "MinhaSenhaSegura123"
  }'
```

Resposta esperada (201): `{ workmailUserId, email }`.
Ex.: `{ "workmailUserId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "email": "joao.silva@bostoncitygroup.com" }`.
Erro 400 se `domain` não for informado.

---

### 5) POST /api/workmail/accounts/reset-password – redefinir senha

```bash
curl -s -X POST "http://localhost:3001/api/workmail/accounts/reset-password" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workmailOrganizationId": "WORKMAIL_ORG_ID",
    "workmailUserId": "WORKMAIL_USER_ID",
    "newPassword": "NovaSenhaSegura456"
  }'
```

Resposta esperada (200): `{ success: true, message: "Senha alterada com sucesso." }` ou `{ success: false, message: "..." }`.

---

### 6) DELETE /api/workmail/accounts – remover conta WorkMail

```bash
curl -s -X DELETE "http://localhost:3001/api/workmail/accounts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workmailOrganizationId": "WORKMAIL_ORG_ID",
    "workmailUserId": "WORKMAIL_USER_ID"
  }'
```

Resposta esperada (200): `{ success: true, message: "Usuário removido com sucesso." }` ou `{ success: false, message: "..." }`.
