-- Módulo Jogos — hub de partidas passadas e futuras (Depto Futebol)

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "impliesSlug")
SELECT 'mod-futebol-jogos', 'futebol_jogos', 'Jogos', 38, 'futebol_logistica'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_jogos');

INSERT INTO "ModuleRole" ("moduleId", "role")
SELECT m."id", r.role
FROM "Module" m
CROSS JOIN (VALUES
  ('super_admin'),
  ('company_admin'),
  ('editor'),
  ('diretoria'),
  ('analista')
) AS r(role)
WHERE m."slug" = 'futebol_jogos'
  AND NOT EXISTS (
    SELECT 1 FROM "ModuleRole" mr
    WHERE mr."moduleId" = m."id" AND mr."role" = r.role
  );
