# npm vs pnpm neste projeto

O monorepo usa **pnpm** (definido em `package.json` na raiz). Para instalar dependências:

## Correto

Na **raiz** do projeto (`E:\DEV\BCG SITE`):

```powershell
pnpm install
```

Isso instala dependências de todos os workspaces (`apps/api`, `apps/web`, etc.), incluindo a nova `@aws-sdk/client-s3` em `apps/api`.

## Evitar

- **Não** rode `npm install` dentro de `apps/api` — pode dar erro `Cannot read properties of null (reading 'matches')` por conflito com workspaces/lockfile do pnpm.
- Se precisar instalar um pacote só na API, use na raiz com filtro:

  ```powershell
  pnpm add @aws-sdk/client-s3 --filter api
  ```

  Ou, após `pnpm install` na raiz, as dependências do `apps/api/package.json` já estarão instaladas.
