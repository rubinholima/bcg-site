-- Módulo Psicologia: avaliação psicológica e calendário de consultas (só quem tem acesso vê a aba)
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-psicologia', 'psicologia', 'Psicologia (avaliação + consultas)', 5.5
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'psicologia');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-psi-sa', 'mod-psicologia', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-psicologia' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-psi-ca', 'mod-psicologia', 'company_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-psicologia' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-psi-ed', 'mod-psicologia', 'editor', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-psicologia' AND "role" = 'editor');
