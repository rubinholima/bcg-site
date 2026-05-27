-- Permissão por item de menu: slug de menu pode implicar módulo de API (impliesSlug).
ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS "impliesSlug" TEXT;
