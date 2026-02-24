# Cognito — Allowed Callback URLs (OBRIGATÓRIO)

O login usa **fluxo POST** (o GET perde o `code` no proxy/CloudFront).

## O que configurar no Cognito

No **AWS Cognito** → User Pool → App integration → App client → **Allowed callback URLs**:

```
https://www.bostoncitygroup.biz/auth/callback
https://bostoncitygroup.biz/auth/callback
```

## Fluxo (form POST — navegação completa)

1. Cognito redireciona para `/auth/callback?code=xxx&state=/dashboard` (página)
2. Página renderiza form oculto e faz **submit** (não fetch) para `/api/auth/callback`
3. Servidor retorna **302 + Set-Cookie** para `/dashboard`
4. Browser segue o redirect — cookies enviados no request seguinte

**Importante:** `NEXT_PUBLIC_APP_URL` deve ser a URL canônica (ex: `https://www.bostoncitygroup.biz`). Use sempre o mesmo host (www ou apex) para login e dashboard.
