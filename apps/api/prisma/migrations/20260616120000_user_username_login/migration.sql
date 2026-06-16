-- Login por username + troca obrigatória de senha para novos usuários

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Backfill username a partir do primeiro nome (Rubinho Lima → rubinholima)
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  final_slug TEXT;
  n INT;
BEGIN
  FOR rec IN SELECT id, email, name FROM "User" ORDER BY "createdAt" ASC LOOP
    IF lower(trim(rec.email)) = 'rl@bostoncitygroup.biz' THEN
      final_slug := 'rubinholima';
    ELSE
      base_slug := lower(regexp_replace(
        split_part(coalesce(nullif(trim(rec.name), ''), split_part(rec.email, '@', 1)), ' ', 1),
        '[^a-z0-9]', '', 'gi'
      ));
      IF base_slug IS NULL OR base_slug = '' OR length(base_slug) < 2 THEN
        base_slug := lower(regexp_replace(split_part(rec.email, '@', 1), '[^a-z0-9]', '', 'gi'));
      END IF;
      IF base_slug IS NULL OR base_slug = '' THEN
        base_slug := 'user';
      END IF;
      final_slug := base_slug;
      n := 2;
      WHILE EXISTS (
        SELECT 1 FROM "User" u WHERE u.username = final_slug AND u.id <> rec.id
      ) LOOP
        final_slug := base_slug || n::text;
        n := n + 1;
      END LOOP;
    END IF;
    UPDATE "User" SET username = final_slug WHERE id = rec.id;
  END LOOP;
END $$;

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
