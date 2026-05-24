-- Role comissao: permissões padrão nos módulos operacionais de futebol
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-fcom-co', m.id, 'comissao', true
FROM "Module" m WHERE m.slug = 'futebol_comissao'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m.id AND mr.role = 'comissao');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-flog-co', m.id, 'comissao', true
FROM "Module" m WHERE m.slug = 'futebol_logistica'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m.id AND mr.role = 'comissao');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-fana-co', m.id, 'comissao', true
FROM "Module" m WHERE m.slug = 'futebol_analise'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m.id AND mr.role = 'comissao');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ffis-co', m.id, 'comissao', true
FROM "Module" m WHERE m.slug = 'futebol_fisiologia'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m.id AND mr.role = 'comissao');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-rel-co', m.id, 'comissao', true
FROM "Module" m WHERE m.slug = 'relatorios'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m.id AND mr.role = 'comissao');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-tip-co', m.id, 'comissao', true
FROM "Module" m WHERE m.slug = 'tipos'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m.id AND mr.role = 'comissao');
