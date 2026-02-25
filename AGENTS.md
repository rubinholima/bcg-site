# AGENTS.md

## Cursor Cloud specific instructions

### Architecture

pnpm monorepo (`bostoncitygroup-platform`) with two apps:

| App | Path | Framework | Dev Port |
|-----|------|-----------|----------|
| **api** | `apps/api` | NestJS 11 + Prisma 7 | 3001 |
| **web** | `apps/web` | Next.js 16 (App Router) + React 19 | 3000 |

PostgreSQL 16 runs via `docker compose up -d` from the repo root.

### Running services

Standard commands are in each app's `package.json`. Key notes:

1. **Start PostgreSQL first**: `sudo docker compose up -d` (repo root). Verify with `sudo docker exec bcg_db pg_isready -U bcg`.
2. **API requires env vars**: Create `apps/api/.env` with at minimum `DATABASE_URL`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `VAULT_MASTER_KEY`. For local dev without real AWS, use placeholder values — the API will start but S3/Cognito operations will fail gracefully.
3. **Web requires**: Create `apps/web/.env.local` with `API_BASE_URL=http://localhost:3001`.
4. **Prisma**: After DB is up, run from `apps/api`: `npx prisma generate && npx prisma migrate deploy`.
5. **Seed data**: `pnpm --filter api run seed:group-home` seeds the Group Home page content.
6. **Start API**: `pnpm run start:dev` from `apps/api` (watches for changes; logger level is `['error', 'warn']` so no startup banner appears — verify via `curl http://localhost:3001/public/group-home`).
7. **Start Web**: `pnpm dev` from `apps/web`.

### Gotchas

- The API logger is configured with `['error', 'warn']` only — you won't see a "Nest application successfully started" message. Check the port with `curl`.
- `S3Service` constructor throws if `AWS_S3_BUCKET` is empty — always set it (even to a placeholder) in `.env`.
- The `apps/web/pnpm-lock.yaml` triggers a Turbopack warning about multiple lockfiles; this is harmless.
- Lint commands (`pnpm run lint`) exit with non-zero due to pre-existing warnings/errors in both apps — this is the baseline state of the repo.
- The public homepage (`/`) on the web app may redirect to `/login` if the `AuthContext` triggers an auth check. The public API endpoints (under `/public/*`) work independently.
- The `prisma.config.ts` file has a fallback DATABASE_URL matching the docker-compose credentials, so Prisma commands work even without an explicit `.env` in many cases.
