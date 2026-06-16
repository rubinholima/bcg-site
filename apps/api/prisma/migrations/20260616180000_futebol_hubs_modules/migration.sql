-- Hubs Futebol: Performance, Captação, Try-outs

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea")
SELECT 'mod-futebol-performance', 'futebol_performance', 'Performance', 34, 'futebol_tecnico'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_performance');

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea")
SELECT 'mod-futebol-captacao', 'futebol_captacao', 'Captação', 35, 'futebol_tecnico'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_captacao');

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea")
SELECT 'mod-futebol-tryouts', 'futebol_tryouts', 'Try-outs', 36, 'futebol_tecnico'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_tryouts');

-- futebol_performance
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fperf-sa', 'mod-futebol-performance', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-performance' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fperf-ca', 'mod-futebol-performance', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-performance' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fperf-ed', 'mod-futebol-performance', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-performance' AND "role" = 'editor');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fperf-co', 'mod-futebol-performance', 'comissao', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-performance' AND "role" = 'comissao');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fperf-an', 'mod-futebol-performance', 'analista', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-performance' AND "role" = 'analista');

-- futebol_captacao
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fcap-sa', 'mod-futebol-captacao', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-captacao' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fcap-ca', 'mod-futebol-captacao', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-captacao' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fcap-ed', 'mod-futebol-captacao', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-captacao' AND "role" = 'editor');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fcap-co', 'mod-futebol-captacao', 'comissao', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-captacao' AND "role" = 'comissao');

-- futebol_tryouts
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-ftry-sa', 'mod-futebol-tryouts', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-tryouts' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-ftry-ca', 'mod-futebol-tryouts', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-tryouts' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-ftry-ed', 'mod-futebol-tryouts', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-tryouts' AND "role" = 'editor');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-ftry-co', 'mod-futebol-tryouts', 'comissao', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-tryouts' AND "role" = 'comissao');
