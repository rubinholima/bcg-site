INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea", "impliesSlug")
SELECT 'mod-futebol-logistica-uniformes', 'futebol_logistica_uniformes', 'Gestão de uniformes', 201, 'futebol_tecnico', NULL
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_logistica_uniformes');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-uniform-' || pr."slug", m."id", pr."slug", false
FROM "Module" m
CROSS JOIN "PlatformRole" pr
WHERE m."slug" = 'futebol_logistica_uniformes'
  AND pr."includeInMatrix" = true
  AND pr."isActive" = true
  AND NOT EXISTS (
    SELECT 1 FROM "ModuleRole" mr
    WHERE mr."moduleId" = m."id" AND mr."role" = pr."slug"
  );

UPDATE "ModuleRole" mr
SET "canAccess" = true
FROM "Module" m
WHERE mr."moduleId" = m."id"
  AND m."slug" = 'futebol_logistica_uniformes'
  AND mr."role" IN ('super_admin', 'company_admin');
