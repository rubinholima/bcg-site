# Cognito — Allowed Callback URLs (OBRIGATÓRIO)

O login agora usa **fluxo GET direto**: Cognito redireciona para `/api/auth/callback`, o servidor troca o code por tokens, define cookies e redireciona para /dashboard — tudo em uma resposta. Sem fetch no cliente.

## O que configurar no Cognito

No **AWS Cognito** → User Pool → App integration → App client → **Allowed callback URLs**, adicione:

```
https://www.bostoncitygroup.biz/api/auth/callback
https://bostoncitygroup.biz/api/auth/callback
```

Se usar subdomínio `origin`:

```
https://origin.bostoncitygroup.biz/api/auth/callback
```

**Remova** (se existir) as URLs antigas com `/auth/callback` (sem `/api`), ou mantenha-as se quiser compatibilidade com links antigos.

## Por que isso resolve

O fluxo anterior: Cognito → /auth/callback (página) → fetch POST /api/auth/callback → cookies. Os cookies não chegavam no request seguinte (CloudFront/proxy/domain).

O novo fluxo: Cognito → GET /api/auth/callback?code=xxx → servidor retorna 302 + Set-Cookie → browser segue redirect para /dashboard. Tudo em uma resposta; os cookies vêm na mesma resposta do redirect.
