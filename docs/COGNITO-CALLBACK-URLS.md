# Cognito — Allowed Callback URLs (OBRIGATÓRIO)

O login usa **fluxo POST** (o GET perde o `code` no proxy/CloudFront).

## O que configurar no Cognito

No **AWS Cognito** → User Pool → App integration → App client → **Allowed callback URLs**:

```
https://www.bostoncitygroup.biz/auth/callback
https://bostoncitygroup.biz/auth/callback
```

## Fluxo

1. Cognito redireciona para `/auth/callback?code=xxx&state=/dashboard` (página)
2. Página faz POST com o code no body para `/api/auth/callback`
3. Servidor retorna **302 + Set-Cookie** para `/dashboard`
4. Browser define cookies e segue o redirect (client faz `window.location.replace`)
