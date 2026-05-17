-- Módulo Boston TV na matriz de permissões (Conteúdo e mídia), independente do Planner (marketing)

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea")
SELECT 'mod-boston-tv', 'boston_tv', 'Boston TV', 32, 'conteudo_midia'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'boston_tv');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-btv-sa', 'mod-boston-tv', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-boston-tv' AND "role" = 'super_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-btv-ca', 'mod-boston-tv', 'company_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-boston-tv' AND "role" = 'company_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-btv-ed', 'mod-boston-tv', 'editor', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-boston-tv' AND "role" = 'editor');
