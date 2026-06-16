-- Análise e desempenho (vídeo) + Preparação física — reorganização dept. Futebol

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea")
SELECT 'mod-futebol-analise-desempenho', 'futebol_analise_desempenho', 'Análise e desempenho (vídeo)', 37, 'futebol_tecnico'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_analise_desempenho');

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea")
SELECT 'mod-futebol-preparacao-fisica', 'futebol_preparacao_fisica', 'Preparação física', 38, 'futebol_tecnico'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_preparacao_fisica');

-- futebol_analise_desempenho
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fad-sa', 'mod-futebol-analise-desempenho', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-analise-desempenho' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fad-ca', 'mod-futebol-analise-desempenho', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-analise-desempenho' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fad-ed', 'mod-futebol-analise-desempenho', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-analise-desempenho' AND "role" = 'editor');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fad-co', 'mod-futebol-analise-desempenho', 'comissao', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-analise-desempenho' AND "role" = 'comissao');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fad-an', 'mod-futebol-analise-desempenho', 'analista', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-analise-desempenho' AND "role" = 'analista');

-- futebol_preparacao_fisica
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fpf-sa', 'mod-futebol-preparacao-fisica', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-preparacao-fisica' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fpf-ca', 'mod-futebol-preparacao-fisica', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-preparacao-fisica' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fpf-ed', 'mod-futebol-preparacao-fisica', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-preparacao-fisica' AND "role" = 'editor');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fpf-co', 'mod-futebol-preparacao-fisica', 'comissao', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-preparacao-fisica' AND "role" = 'comissao');
