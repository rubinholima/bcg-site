-- Módulo Importação FMF (Ferramentas)

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea")
SELECT 'mod-fmf-scraper', 'fmf_scraper', 'Importação FMF', 33, 'ferramentas'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'fmf_scraper');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-fmf-sa', 'mod-fmf-scraper', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-fmf-scraper' AND "role" = 'super_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-fmf-ca', 'mod-fmf-scraper', 'company_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-fmf-scraper' AND "role" = 'company_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-fmf-ed', 'mod-fmf-scraper', 'editor', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-fmf-scraper' AND "role" = 'editor');
