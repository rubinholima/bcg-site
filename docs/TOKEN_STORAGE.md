# Token storage — Fase 2

## Onde os tokens ficam

- **Local:** HTTP-only cookies (navegador).
- **Definidos em:** `apps/web/src/app/api/auth/callback/route.ts` (callback do Cognito Hosted UI).

## Cookies

| Nome           | Conteúdo      | Opções                          |
|----------------|---------------|----------------------------------|
| `id_token`     | JWT ID token  | path=/, httpOnly, sameSite=lax, maxAge=7d |
| `access_token` | JWT access    | path=/, httpOnly, sameSite=lax, maxAge=7d |
| `refresh_token`| Refresh token | path=/, httpOnly, sameSite=lax, maxAge=30d |

## Como recuperar

- **No servidor (Next.js):** `request.cookies.get('access_token')?.value` ou `request.cookies.get('id_token')?.value` em API Routes ou Server Components.
- **No browser:** não é possível ler (httpOnly). O frontend chama `GET /api/me` com `credentials: 'include'`; a API route lê o cookie e repassa `Authorization: Bearer <token>` ao backend `GET /me`.
- **Resumo:** Token storage = **HTTP-only cookies**. Recuperar no servidor via `request.cookies`; no frontend usar `/api/me` (proxy que envia o cookie ao backend).

## Fluxo de login (sem alteração)

1. Usuário acessa `/login` e clica em Entrar.
2. Redirect para Cognito Hosted UI (Managed Login).
3. Cognito redireciona para `/api/auth/callback?code=...`.
4. A route troca `code` por tokens no servidor (fetch para Cognito só no servidor).
5. Define os cookies e redireciona para `/dashboard`.

Nenhum fetch/axios para `cognito-idp.amazonaws.com` no browser.

## Logout e URL de saída

1. O usuário clica em **Sair** no dashboard; o link aponta para a URL de logout do Cognito com `logout_uri` apontando para **nossa tela de login** (`/login`).
2. O Cognito encerra a sessão e redireciona o usuário para essa URL.

**Para evitar a tela "Invalid request" da AWS:** a URL de logout que enviamos (`logout_uri`) **precisa estar cadastrada** no App Client do Cognito. Se não estiver, o Cognito mostra "Invalid request" em vez de redirecionar.

### Passos no AWS Console

1. Acesse **AWS Console** → **Cognito** → seu **User Pool**.
2. Aba **App integration** → em **App client and analytics**, clique no **App client** que o frontend usa (o mesmo `NEXT_PUBLIC_COGNITO_CLIENT_ID`).
3. Em **Hosted UI**, clique em **Edit** (ou **Edit Hosted UI**).
4. No campo **Sign out URL(s)** (ou **Sign-out URL(s)**):
   - Adicione exatamente: `http://localhost:3000/login` (desenvolvimento).
   - Para produção, adicione também: `https://seu-dominio.com/login`.
5. **Save changes**.

**Importante:** use a URL exata, sem barra no final (`/login` e não `/login/`), e o mesmo protocolo e porta que o app usa. Depois de salvar, faça logout de novo; o Cognito deve redirecionar para a nossa tela de login em vez da tela de erro.
