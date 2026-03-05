-- Role analista: adicionar ModuleRole para módulos principais (tipos, empresas, usuarios)
-- Analista tem acesso padrão a visualização de dados
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-tip-ana', 'mod-tipos', 'analista', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-tipos' AND "role" = 'analista');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-emp-ana', 'mod-empresas', 'analista', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-empresas' AND "role" = 'analista');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-usu-ana', 'mod-usuarios', 'analista', false
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-usuarios' AND "role" = 'analista');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-dash-ana', 'mod-dashboard', 'analista', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-dashboard' AND "role" = 'analista');
