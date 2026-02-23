# Correção de encoding UTF-8 na Home

## Problema

Acentuação corrompida na página principal (ex.: "Manhuaçu" → "Manhua |°u", "negócios" → "neg├│cios").  
Mojibake típico de UTF-8 interpretado como Windows-1252 ou Latin-1.

## Causa

O JSON que chega no navegador via `/api/public/group-home` já vem corrompido.  
O banco e a API (via `curl localhost:3001`) retornam corretamente.  
A corrupção ocorre entre a API e o cliente — provavelmente no Nginx ou CDN em produção.

## Solução implementada

**Buscar os dados no servidor (RSC) diretamente do backend**, sem passar pelo Nginx:

1. **`page.tsx`** (Server Component): faz `fetch` em `127.0.0.1:3001` (ou `API_BASE_URL`).
2. **`HomeClient`**: recebe `initialGroupHome`, `initialPortfolio`, `initialGroup` como props.
3. **Sem fetch no cliente** para o carregamento inicial — os dados vêm do servidor com UTF-8 correto.

## Arquivos alterados

- `apps/web/src/lib/home-content.ts` — `fetchGroupHomeFromBackend()` (usa `buildBackendUrl("/public/group-home")`).
- `apps/web/src/app/page.tsx` — Server Component que busca e passa dados para `HomeClient`.
- `apps/web/src/app/HomeClient.tsx` — Novo componente cliente que recebe dados iniciais.

## Fluxo

```
Antes: Browser → Nginx → Backend → (corrupção possível) → Browser
Agora:  Browser → Next.js → fetch(127.0.0.1:3001) → Backend → Next.js → Browser (UTF-8 correto)
```

## Alternativa (Nginx)

Se precisar de ajustar o Nginx no futuro:

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3001/;
  charset utf-8;
  proxy_set_header Accept-Charset "utf-8";
}
```

Evitar `charset_map` ou conversões de encoding que possam corromper UTF-8.
