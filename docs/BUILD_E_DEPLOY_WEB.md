# Build e deploy do app Web (Next.js)

## Objetivo

- `pnpm --filter web build` deve passar **sem erros de TypeScript** no Windows (local) e no Linux (servidor).
- `next start` deve encontrar o diretório `.next` em `apps/web` e subir o app.

## Comandos (local e servidor)

### 1. Instalar dependências (raiz do monorepo)

```bash
pnpm install
```

### 2. Build do app web

```bash
pnpm --filter web build
```

- Gera o diretório **`apps/web/.next`** (produção).
- Se aparecerem erros de **TypeScript**, devem ser corrigidos antes de fazer deploy.
- Erros de **runtime** na fase "Generating static pages" (ex.: `Failed to parse URL from /api/...`, timeouts em rotas do dashboard) são esperados quando as APIs não estão disponíveis no ambiente de build; não impedem que o build de compilação conclua.

### 3. Subir o app (teste local)

```bash
pnpm --filter web start -- --port 3000
```

- Deve ser executado **depois** do build.
- O app fica em `http://localhost:3000`.

### 4. Servidor (Linux) com PM2

Exemplo de comando para o PM2 (ajustar nome do app e porta conforme o ambiente):

```bash
# Na raiz do monorepo, após build:
pnpm --filter web start -- --port 3000
```

Ou com PM2 (a partir da raiz do repositório):

```bash
cd /caminho/do/repo
pnpm install
pnpm --filter web build
pm2 start "pnpm --filter web start -- --port 3000" --name bcg-web
# ou, se o PM2 estiver configurado para o diretório apps/web:
# pm2 start npm --name bcg-web -- start
# (garantindo que o "start" use o .next em apps/web)
```

- Garantir que o **working directory** do processo seja a **raiz do monorepo** (onde está o `pnpm-workspace.yaml`), para que `pnpm --filter web start` resolva corretamente.
- O `.next` fica em `apps/web/.next`; o comando `next start` do script `web` roda no contexto de `apps/web`, então encontra o `.next` correto.

### 5. Validar no servidor

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Esperado: 200 (ou 307/302 em rotas que redirecionam)
```

## Configuração do Next (monorepo)

- **Lockfile**: usar apenas o `pnpm-lock.yaml` na **raiz** do monorepo. Não há `pnpm-lock.yaml` em `apps/web`.
- **Raiz do build**: em `apps/web/next.config.ts` estão definidos `outputFileTracingRoot` e `turbopack.root` apontando para a raiz do monorepo, para evitar warning de múltiplos lockfiles e inferência errada de raiz.

## Resumo

| Etapa              | Comando                              | Onde rodar   |
|--------------------|--------------------------------------|-------------|
| Instalar           | `pnpm install`                       | Raiz repo   |
| Build              | `pnpm --filter web build`            | Raiz repo   |
| Start (teste)      | `pnpm --filter web start -- --port 3000` | Raiz repo   |
| PM2 (produção)     | `pm2 start "pnpm --filter web start -- --port 3000" --name bcg-web` | Raiz repo   |
