# Token storage — Fase 2

## Onde os tokens ficam

- **Local:** HTTP-only cookies (navegador).
- **Definidos em:** `apps/web/src/app/api/auth/callback/route.ts` (callback do Cognito Hosted UI).

## Cookies

| Nome            | Conteúdo      | Opções                                     |
| --------------- | ------------- | ------------------------------------------ |
| `id_token`      | JWT ID token  | path=/, httpOnly, sameSite=lax, maxAge=7d  |
| `access_token`  | JWT access    | path=/, httpOnly, sameSite=lax, maxAge=7d  |
| `refresh_token` | Refresh token | path=/, httpOnly, sameSite=lax, maxAge=30d |

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

## Renovação automática (evitar erro de token)

Para o token expirado **não** derrubar o usuário:

1. **Refresh token:** o login pede `scope: "openid offline_access"`. O Cognito devolve `refresh_token` e o callback grava em cookie. No **App Client** do Cognito (Hosted UI) é preciso ter os scopes **OpenID** e **offline_access** (ou o que permitir refresh) habilitados; caso contrário pode dar `invalid_scope`.
2. **Rota de refresh:** `POST /api/auth/refresh` lê o cookie `refresh_token`, troca por novos `id_token` e `access_token` no Cognito e atualiza os cookies.
3. **authFetch:** no frontend, use `authFetch` de `@/lib/authFetch` em vez de `fetch` para chamadas à nossa API (`/api/...`). Em **401**, o `authFetch` chama `/api/auth/refresh` e repete a requisição uma vez. Assim a sessão é renovada em background e o usuário não vê "token invalid".

**Resumo:** use `authFetch` em todas as chamadas autenticadas ao Next (ex.: `/api/me`, `/api/users`, `/api/group`). Novas páginas do dashboard devem usar `authFetch` para não depender de token “fresco” manualmente.

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

## "Invalid token" / "Não foi possível concluir o login"

Quando o login falha na tela de callback (erro vermelho "Não foi possível concluir o login"):

1. **Allowed callback URLs** — No App Client → Hosted UI → **Allowed callback URLs**, adicione **exatamente**:
   - `http://localhost:3000/api/auth/callback` (dev)
   - `http://127.0.0.1:3000/api/auth/callback` (se usar 127.0.0.1)
   - Em produção: a URL canônica definida em `NEXT_PUBLIC_APP_URL`, ex.: `https://www.bostoncitygroup.biz/api/auth/callback`
   - Se o domínio tiver www e sem-www: adicione **ambas** (`https://www.dominio.com/api/auth/callback` e `https://dominio.com/api/auth/callback`) OU defina `NEXT_PUBLIC_APP_URL` com a URL canônica e use sempre essa
2. **Scopes** — Em Hosted UI, habilite **OpenID** e **offline_access** (evita `invalid_scope`).
3. **URL consistente** — Em produção, defina `NEXT_PUBLIC_APP_URL` com a URL canônica (ex.: `https://www.bostoncitygroup.biz`). O login usará essa URL para o callback, evitando divergência entre www e sem-www.
4. **Novo login** — Após alterar scopes ou callback URLs no Cognito, limpe os cookies do site e faça login de novo.
5. **Log do servidor** — Se ainda falhar, veja o terminal do Next.js: `[auth/callback] token exchange failed` mostra a resposta exata do Cognito.

## Erro `invalid_scope` no callback

Se o callback retorna `?error=invalid_request&error_description=invalid_scope`:

O App Client do Cognito não tem todos os scopes que estamos pedindo. Por padrão pedimos `openid offline_access`.

**Solução 1 (recomendada):** No AWS Console → Cognito → User Pool → App integration → seu App Client → Hosted UI → **Edit** → em **Allowed OAuth scopes**, marque:
- `openid`
- `offline_access` (necessário para refresh_token)

**Solução 2 (temporária):** Se não puder alterar o Cognito agora, use scopes que o App Client já permite. No `.env.local`:
```
NEXT_PUBLIC_COGNITO_SCOPES=openid
```
ou, se o App Client tiver profile/email:
```
NEXT_PUBLIC_COGNITO_SCOPES=openid profile email
```
O login funcionará, mas **não haverá refresh_token** — a sessão expirará quando o JWT vencer e o usuário precisará fazer login de novo.
