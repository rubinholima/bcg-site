-- Módulo Jogos — hub de partidas passadas e futuras (Depto Futebol)

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "impliesSlug")
SELECT 'mod-futebol-jogos', 'futebol_jogos', 'Jogos', 38, 'futebol_logistica'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_jogos');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-fjog-sa', 'mod-futebol-jogos', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-jogos' AND "role" = 'super_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-fjog-ca', 'mod-futebol-jogos', 'company_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-jogos' AND "role" = 'company_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-fjog-ed', 'mod-futebol-jogos', 'editor', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-jogos' AND "role" = 'editor');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-fjog-di', 'mod-futebol-jogos', 'diretoria', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-jogos' AND "role" = 'diretoria');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-fjog-an', 'mod-futebol-jogos', 'analista', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-jogos' AND "role" = 'analista');
