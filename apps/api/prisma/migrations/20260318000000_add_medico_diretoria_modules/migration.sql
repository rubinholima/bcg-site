-- Módulo médico (histórico médico)
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-medico', 'medico', 'Médico (histórico médico)', 5.4
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'medico');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-med-sa', 'mod-medico', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-medico' AND "role" = 'super_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-med-ca', 'mod-medico', 'company_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-medico' AND "role" = 'company_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-med-ed', 'mod-medico', 'editor', false
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-medico' AND "role" = 'editor');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-med-md', 'mod-medico', 'medico', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-medico' AND "role" = 'medico');

-- Módulo diretoria (avaliações + status)
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-diretoria', 'diretoria', 'Diretoria (avaliações e status)', 5.6
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'diretoria');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-dir-sa', 'mod-diretoria', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-diretoria' AND "role" = 'super_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-dir-ca', 'mod-diretoria', 'company_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-diretoria' AND "role" = 'company_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-dir-ed', 'mod-diretoria', 'editor', false
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-diretoria' AND "role" = 'editor');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-dir-dir', 'mod-diretoria', 'diretoria', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-diretoria' AND "role" = 'diretoria');

-- Psicologia: adicionar role psicologo
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-psi-psi', 'mod-psicologia', 'psicologo', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-psicologia' AND "role" = 'psicologo');

-- Tipos (Cadastros/Jogadores): permitir que medico, psicologo e diretoria vejam o menu
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-tip-md', 'mod-tipos', 'medico', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-tipos' AND "role" = 'medico');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-tip-psi', 'mod-tipos', 'psicologo', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-tipos' AND "role" = 'psicologo');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-tip-dir', 'mod-tipos', 'diretoria', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-tipos' AND "role" = 'diretoria');
