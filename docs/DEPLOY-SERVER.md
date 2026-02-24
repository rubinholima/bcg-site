# Deploy no servidor (AWS Lightsail / Ubuntu)

Passo a passo para rodar o projeto no servidor com **PM2**. Pressupõe: Node.js, pnpm, Git e PM2 instalados; PostgreSQL rodando (no mesmo servidor ou em 127.0.0.1).

---

## 1. Variáveis de ambiente no servidor

Crie/edite o `.env` na pasta do projeto (ex.: `~/bcg-site/apps/api/.env` para a API). Exemplo:

```env
NODE_ENV=production
DATABASE_URL=postgresql://USUARIO:SENHA@127.0.0.1:5432/bcg_platform?schema=public&options=-c%20client_encoding%3DUTF8
```

- Use **127.0.0.1** em vez de `localhost` para evitar problema de IPv6 no Node.
- Adicione `&options=-c%20client_encoding%3DUTF8` para garantir UTF-8 na conexão (evita acentuação corrompida).
- Se o Postgres estiver em outro host, troque `127.0.0.1` pelo IP/host correto.

O front (Next.js) pode ter seu próprio `.env` em `apps/web` se precisar (ex.: `NEXT_PUBLIC_*`, `API_BASE_URL`).

---

## 2. Atualizar código e instalar dependências

Na pasta do repositório (ex.: `~/bcg-site`):

```bash
cd ~/bcg-site
git pull origin develop
pnpm install
```

---

## 3. API (NestJS)

```bash
cd ~/bcg-site/apps/api
pnpm exec prisma generate
pnpm run build
```

Garanta que `apps/api/.env` existe e tem `DATABASE_URL` e `NODE_ENV=production`.

**Subir com PM2 (primeira vez):**

```bash
cd ~/bcg-site/apps/api
pm2 start dist/main.js --name api
pm2 save
pm2 startup
```

**Só reiniciar depois de um deploy:**

```bash
cd ~/bcg-site/apps/api
pnpm exec prisma generate
pnpm run build
pm2 restart api
```

A API deve escutar na porta que você configurou (ex.: 3001). Confirme com `pm2 logs api`.

---

## 4. Web (Next.js)

```bash
cd ~/bcg-site/apps/web
pnpm run build
```

**Subir com PM2 (primeira vez):**

```bash
cd ~/bcg-site/apps/web
pm2 start pnpm --name web -- start
pm2 save
```

Ou, se preferir chamar o Node direto no build do Next:

```bash
cd ~/bcg-site/apps/web
pm2 start node_modules/.bin/next --name web -- start
pm2 save
```

**Só reiniciar depois de um deploy:**

```bash
cd ~/bcg-site/apps/web
pnpm run build
pm2 restart web
```

---

## 5. Script único (deploy.sh)

Na raiz do repo (`~/bcg-site/deploy.sh`), com execução permitida (`chmod +x deploy.sh`):

```bash
#!/bin/bash
set -e
cd "$(dirname "$0")"

echo ">>> git pull"
git pull origin develop

echo ">>> pnpm install"
pnpm install

echo ">>> API: prisma generate + build"
cd apps/api
pnpm exec prisma generate
pnpm run build
cd ../..

echo ">>> Web: build"
cd apps/web
pnpm run build
cd ../..

echo ">>> PM2 restart"
pm2 restart api web || true

echo ">>> Deploy concluído."
```

Uso:

```bash
cd ~/bcg-site && ./deploy.sh
```

---

## 6. Nginx: rota de login (callback)

Se você usa **Nginx** na frente do Next e do backend, o login Cognito depende da rota **POST /api/auth/callback** ir para o **Next.js** (porta 3000), não para o backend Nest (3001). Caso contrário o usuário “não entra” e pode não ver erro.

Exemplo de regra **antes** do proxy geral de `/api/`:

```nginx
location ^~ /api/auth/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffer_size 16k;
    proxy_buffers 4 16k;
}
```

(Veja `docs/FIX-502-LOGIN.md` — sem `proxy_buffer_size` a resposta com 3 cookies JWT causa 502.)

Assim `/api/auth/callback` e outras rotas em `/api/auth/` são atendidas pelo Next; o restante de `/api/` pode continuar indo para o backend.

---

## 7. Checklist rápido

| Item | Conferir |
|------|----------|
| `NODE_ENV=production` | No .env da API (e do Web se usar) |
| `DATABASE_URL` | Com **127.0.0.1** (não localhost) |
| Prisma | `prisma generate` depois do pull e antes do build da API |
| PM2 | `api` e `web` no `pm2 list`; `pm2 logs` sem erro de Prisma |
| Portas | API (ex.: 3001) e Web (ex.: 3000) abertas no firewall e no Nginx (se usar) |
| Nginx + login | `/api/auth/` deve ir para o **Next** (3000); ver seção 6 |

---

## 8. Erros comuns

- **PrismaClientInitializationError / "adapter or accelerateUrl"**  
  O projeto usa **Prisma 6** (não 7). Prisma 7 exige adapter ou Accelerate; o adapter travava no Lightsail. Mantenha `@prisma/client` e `prisma` em 6.8.2.

- **Conexão recusada com o banco**  
  Conferir `DATABASE_URL`, que o Postgres está rodando e que está usando **127.0.0.1** (não `localhost`).

- **Build do Next falha em algum .ts**  
  Arquivos devem estar com fim de linha LF (não CRLF). Projeto tem `.editorconfig` com `end_of_line = lf`.

- **API sobe mas não responde**  
  Ver porta no `main.ts` e no Nginx; ver se o PM2 está realmente rodando `api` e `web`.

- **Acentuação corrompida (negócios → neg | cios, etc.)**  
  Dados migrados com encoding errado. Rode o script de correção:  
  `cd apps/api && pnpm run fix:encoding`  
  Depois atualize o `.env` com `&options=-c%20client_encoding%3DUTF8` na DATABASE_URL para evitar novos problemas.

---

## PM2 vs Docker (opinião para este projeto)

**PM2 (o que vocês usam hoje)**  
- Roda a API e o Web como processos Node no próprio Ubuntu.  
- Simples: `git pull`, `pnpm install`, `prisma generate`, `build`, `pm2 restart`.  
- Funciona bem quando: Node e pnpm estão instalados, o `.env` está certo e o Prisma está configurado (opções não vazias, 127.0.0.1, etc.).  
- O problema que tiveram foi de **código e configuração** (Prisma 7, DATABASE_URL, CRLF), não de “falta de Docker”.

**Docker**  
- Iguala o ambiente (mesma versão de Node, mesmo OS) em qualquer máquina.  
- Exige: Dockerfile(s), docker-compose para API + Web (e opcionalmente Postgres), e um fluxo de deploy que faça build de imagem e suba os containers.  
- Para um time pequeno e um servidor único (Lightsail), costuma ser mais trabalho do que benefício **no curto prazo**, principalmente quando o deploy já está instável por causa de Prisma/env.

**Recomendação**  
- **Agora:** Manter PM2. Focar em: (1) PrismaService com `super({ log: [...] })`, (2) DATABASE_URL com 127.0.0.1 em produção, (3) LF nos arquivos, (4) passo a passo e script `deploy.sh` como neste doc. Isso resolve o que quebra no servidor.  
- **Depois:** Se quiserem ambiente idêntico em todo lugar (dev/staging/prod) ou vários servidores, aí vale considerar Docker (Dockerfile para API, para Web, e docker-compose orquestrando). Não é obrigatório para “fazer o deploy funcionar” hoje.
