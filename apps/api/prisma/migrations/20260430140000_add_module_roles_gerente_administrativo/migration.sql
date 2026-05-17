-- Papéis distintos na matriz: gerente e administrativo (ModuleRole por módulo).
-- Padrão: sem acesso até a matriz ser ajustada (super_admin continua com acesso total).

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT concat('mr-', m.slug, '-gerente'), m.id, 'gerente', false
FROM "Module" m
WHERE NOT EXISTS (
  SELECT 1 FROM "ModuleRole" x WHERE x."moduleId" = m.id AND x."role" = 'gerente'
);

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT concat('mr-', m.slug, '-administrativo'), m.id, 'administrativo', false
FROM "Module" m
WHERE NOT EXISTS (
  SELECT 1 FROM "ModuleRole" x WHERE x."moduleId" = m.id AND x."role" = 'administrativo'
);
