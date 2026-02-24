# Configuração de Ambiente — BCG Platform Web

Este documento explica como configurar as variáveis de ambiente para o app Next.js (`apps/web`).

## Variáveis de Ambiente

### `API_BASE_URL` (server-side only)

**Obrigatória** — URL base do backend NestJS.

- **DEV:** `http://localhost:3001`
- **PROD:** `https://api.bostoncitygroup.biz`

Esta variável é usada apenas no servidor (API Routes do Next.js) para fazer proxy das requisições ao backend NestJS. Não é exposta ao cliente (`NEXT_PUBLIC_*`).

**Fallback:** Se não definida, assume `http://localhost:3001` (apenas para desenvolvimento local).

### Cognito (login Hosted UI)

**Não utilizado.** O login é feito por **email e senha** no próprio sistema. Usuários são criados no dashboard (Usuários) e fazem login em `/login`. O backend (API) usa `JWT_SECRET` para assinar o token; configure em produção (ex.: `apps/api/.env`).

Variáveis antigas do Cognito (`COGNITO_DOMAIN`, `COGNITO_CLIENT_ID`) não são mais necessárias para o login.

### `NEXT_PUBLIC_APP_URL`

**Opcional** — URL pública da aplicação web.

- **DEV:** `http://localhost:3000`
- **PROD:** `https://bostoncitygroup.biz`

Usada para gerar URLs públicas, redirects e links absolutos quando necessário.

### `NEXT_PUBLIC_MEDIA_ORIGIN`

**Opcional** — Domínio pelo qual as imagens do S3 são servidas (CloudFront OAC).

- **Padrão:** `https://www.bostoncitygroup.biz`
- Usado por `getPublicImageUrl()` para converter URLs do bucket S3 em URLs do domínio oficial, permitindo uso de `next/image` com otimização.

## Arquivos de Configuração

### `.env.local` (desenvolvimento local)

Crie este arquivo na raiz de `apps/web/` com:

```env
API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**⚠️ IMPORTANTE:** Este arquivo não deve ser commitado no Git (já está no `.gitignore`).

### `.env.example` (template)

Arquivo de exemplo com valores de produção. Use como referência para criar `.env.local` em desenvolvimento ou configurar variáveis de ambiente em produção.

## Como Funciona

### Arquitetura

```
Frontend (Next.js) → API Routes (/api/...) → Backend NestJS (API_BASE_URL)
```

1. **Cliente (browser):** Faz requisições para `/api/...` (URL relativa)
2. **API Routes (Next.js):** Fazem proxy para o backend usando `API_BASE_URL`
3. **Backend NestJS:** Processa a requisição e retorna a resposta

### Helper `apiProxy.ts`

O helper `apps/web/src/lib/apiProxy.ts` centraliza a lógica de comunicação com o backend:

- `getApiBaseUrl()` — retorna `API_BASE_URL` ou fallback para dev
- `buildBackendUrl(path)` — constrói URL completa do backend
- `forwardRequest()` — função utilitária para fazer proxy nas API Routes

### Uso no Código

**API Routes (server-side):**
```typescript
import { forwardRequest } from "@/lib/apiProxy";

export async function GET(request: NextRequest) {
  return forwardRequest(request, "/tenants", { requireAuth: true });
}
```

**SSR (server-side):**
```typescript
import { buildBackendUrl } from "@/lib/apiProxy";

const res = await fetch(buildBackendUrl("/group"), { cache: "no-store" });
```

**Cliente (browser):**
```typescript
// Usa URL relativa /api/...
const res = await fetch("/api/tenants");
```

## Produção

Em produção (Vercel, etc.), configure as variáveis de ambiente:

- `API_BASE_URL=https://api.bostoncitygroup.biz`
- `NEXT_PUBLIC_APP_URL=https://bostoncitygroup.biz`

**Não** use `.env.local` em produção — configure as variáveis diretamente na plataforma de deploy.

## Verificação

Para verificar se está funcionando:

1. **Dev:** Certifique-se de que o backend está rodando em `http://localhost:3001`
2. **Teste:** Acesse `/api/tenants` no browser — deve fazer proxy para o backend local
3. **Logs:** Verifique os logs do Next.js para confirmar que está usando `API_BASE_URL` correto

## Troubleshooting

### Erro: "API_BASE_URL environment variable is not set"

- Crie `.env.local` com `API_BASE_URL=http://localhost:3001`
- Reinicie o servidor Next.js (`pnpm dev`)

### Requisições falhando em produção

- Verifique se `API_BASE_URL` está configurado corretamente na plataforma de deploy
- Confirme que o backend está acessível em `https://api.bostoncitygroup.biz`

### Frontend chamando localhost:3001 diretamente

- Verifique se todas as chamadas no código usam `/api/...` (relativo) ou `buildBackendUrl()` (server-side)
- Não deve haver `NEXT_PUBLIC_API_URL` ou `localhost:3001` hardcoded no código
