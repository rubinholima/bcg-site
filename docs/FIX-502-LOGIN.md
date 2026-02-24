# Fix 502 no login (callback Cognito)

## Causa raiz

O POST `/api/auth/callback` retorna **3 cookies JWT** (id_token, access_token, refresh_token). Cada JWT tem ~1–2KB. O total dos headers de resposta pode passar de **8KB**.

O Nginx usa por padrão `proxy_buffer_size` de **4K ou 8K**. Quando os headers excedem esse limite, o Nginx retorna:

```
upstream sent too big header while reading response header from upstream
```

E devolve **502 Bad Gateway** ao cliente — mesmo que o Next.js tenha respondido 200 corretamente.

## Solução

No Nginx, dentro do `location ^~ /api/auth/`, adicione:

```nginx
proxy_buffer_size 16k;
proxy_buffers 4 16k;
```

O arquivo `docs/nginx-bostoncitygroup.biz.example.conf` já contém essa configuração.

## Aplicar no servidor

1. Edite o config do Nginx (ex.: `/etc/nginx/sites-available/bostoncitygroup.biz`).
2. No bloco `location ^~ /api/auth/` (HTTP e HTTPS), adicione as duas linhas acima.
3. Teste: `sudo nginx -t`
4. Recarregue: `sudo systemctl reload nginx`

## Verificar

- **Antes:** `curl -v -X POST https://www.bostoncitygroup.biz/api/auth/callback -H "Content-Type: application/json" -d '{"code":"test"}'` → 502
- **Depois:** mesmo com code inválido, deve retornar 400 ou JSON de erro, **não** 502 (a menos que o Next esteja fora do ar)

Para testar login real: faça login pelo browser e confira se redireciona para /dashboard sem 502.

## CloudFront (se houver)

Se o site passa por CloudFront:

1. **Cache:** use `CachingDisabled` no behavior de `/api/auth/*` para evitar cache de 502.
2. **Invalidation:** após o fix no Nginx, invalide `/api/auth/*` no CloudFront.
