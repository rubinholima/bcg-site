INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-req-comissao', m."id", 'comissao', true FROM "Module" m WHERE m."slug" = 'requisicoes'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'comissao');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-req-supervisor', m."id", 'supervisor', true FROM "Module" m WHERE m."slug" = 'requisicoes'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'supervisor');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-req-treinador', m."id", 'treinador', true FROM "Module" m WHERE m."slug" = 'requisicoes'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'treinador');
