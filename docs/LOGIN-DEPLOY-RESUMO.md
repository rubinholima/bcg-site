# Login / Deploy — resumo e checklist (7 dias)

## O que você pediu

Resolver o login em produção: entrar e ir para o dashboard, sem voltar para a tela de login e sem 502.

## O que foi tentado

| Problema | O que fizemos |
|----------|----------------|
| **502 no callback** | Nginx: `proxy_buffer_size 16k` e `proxy_buffers 4 16k` em `location ^~ /api/auth/` (resposta com 3 cookies JWT é grande). |
| **Volta para login** | Cookie `domain: ".bostoncitygroup.biz"` para www/new/apex; form POST em vez de fetch; 302 sem cookies no POST e rota `/api/auth/set-cookies` que define os cookies em um GET separado. |
| **GET perdia o code** | Fluxo GET direto (Cognito → /api/auth/callback) foi revertido; proxy/CloudFront cortava a query string. Mantido fluxo POST (página /auth/callback + form). |
| **Subdomínio new** | Inclusão de `https://new.bostoncitygroup.biz/auth/callback` no Cognito e cookies com domain para subdomínios. |

## Fluxo atual (duas respostas)

1. Cognito redireciona para `/auth/callback?code=xxx&state=/dashboard`.
2. Página envia **form POST** para `/api/auth/callback` (code no body).
3. Callback troca o code por tokens, guarda em memória com uma chave, e responde **só 302** para `/api/auth/set-cookies?t=KEY&next=/dashboard` (sem Set-Cookie).
4. O browser segue para GET `/api/auth/set-cookies?t=...`. Essa rota devolve **302 + Set-Cookie** para `/dashboard`.
5. O browser define os cookies e segue para `/dashboard`; o próximo request já vai com cookies.

Assim evitamos 302 + Set-Cookie na mesma resposta do POST (que alguns proxies tratam mal).

## Checklist no servidor (conferir tudo)

### 1. Nginx — `/api/auth/` no Next e buffer grande

Arquivo (ex.): `/etc/nginx/sites-available/bostoncitygroup.biz`.

Dentro de `location ^~ /api/auth/` (blocos 80 e 443):

```nginx
proxy_pass http://127.0.0.1:3000;
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_buffer_size 16k;
proxy_buffers 4 16k;
```

- Testar: `sudo nginx -t`
- Recarregar: `sudo systemctl reload nginx`

### 2. Cognito — Allowed callback URLs

No App Client do User Pool, em **Allowed callback URLs**, incluir **todas** as bases que forem usadas:

- `https://www.bostoncitygroup.biz/auth/callback`
- `https://bostoncitygroup.biz/auth/callback`
- `https://new.bostoncitygroup.biz/auth/callback`

### 3. Env do Next (apps/web)

- `NEXT_PUBLIC_APP_URL`: URL canônica (ex.: `https://www.bostoncitygroup.biz`).
- `COGNITO_DOMAIN` ou `NEXT_PUBLIC_COGNITO_DOMAIN`: domínio do User Pool (ex.: `https://xxx.auth.us-east-1.amazoncognito.com`).
- `COGNITO_CLIENT_ID` ou `NEXT_PUBLIC_COGNITO_CLIENT_ID`: Client ID.

### 4. Deploy

```bash
cd ~/bcg-site
git pull origin develop
./deploy.sh
```

Depois: limpar cookies do site ou testar em aba anônima e tentar o login de novo.

## Se ainda falhar

- Ver logs: `pm2 logs bcg-web --lines 50`
- Conferir se o POST do callback retorna 302 para `/api/auth/set-cookies?t=...` (e não 502).
- Se houver CloudFront na frente: desabilitar cache para `/api/auth/*` e invalidar esse path.

Referência de config Nginx completa: `docs/nginx-bostoncitygroup.biz.example.conf`.
