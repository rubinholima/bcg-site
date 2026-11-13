-- CUP360 — catálogo Module: importação histórica e Omie (leitura/reconciliação)
-- Idempotente: Module + ModuleRole (anti-duplicata PROMPT 050)

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea", "impliesSlug")
SELECT gen_random_uuid()::text, v.slug, v.name, v.ord, 'adm_departamentos', NULL
FROM (VALUES
  ('finance_import_view', 'Financeiro — ver importações', 314),
  ('finance_import_create', 'Financeiro — enviar lote de importação', 315),
  ('finance_import_approve', 'Financeiro — aprovar importação', 316),
  ('finance_import_execute', 'Financeiro — executar importação canônica', 317),
  ('finance_omie_view', 'Financeiro — ver Omie (leitura)', 318),
  ('finance_omie_sync', 'Financeiro — sincronizar leitura Omie', 319),
  ('finance_omie_reconcile', 'Financeiro — reconciliar Omie', 320)
) AS v(slug, name, ord)
WHERE NOT EXISTS (SELECT 1 FROM "Module" m WHERE m."slug" = v.slug);

-- Quem já tem adm_financeiro na matriz legada: só visão (import + Omie)
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT DISTINCT ON (m.id, mr.role)
  gen_random_uuid()::text,
  m.id,
  mr.role,
  true
FROM "Module" m
JOIN "Module" adm ON adm."slug" = 'adm_financeiro'
JOIN "ModuleRole" mr ON mr."moduleId" = adm.id AND mr."canAccess" = true
WHERE m."slug" IN ('finance_import_view', 'finance_omie_view')
AND NOT EXISTS (
  SELECT 1 FROM "ModuleRole" x WHERE x."moduleId" = m.id AND x."role" = mr.role
)
ORDER BY m.id, mr.role;

-- Perfis administrativos plataforma: catálogo completo atribuível (super_admin / company_admin)
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT gen_random_uuid()::text, m.id, r.role, true
FROM "Module" m
CROSS JOIN (VALUES ('super_admin'), ('company_admin')) AS r(role)
WHERE m."slug" IN (
  'finance_import_view',
  'finance_import_create',
  'finance_import_approve',
  'finance_import_execute',
  'finance_omie_view',
  'finance_omie_sync',
  'finance_omie_reconcile'
)
AND NOT EXISTS (
  SELECT 1 FROM "ModuleRole" x WHERE x."moduleId" = m.id AND x."role" = r.role
);

-- Editor: somente visão (sem execute / sync / reconcile automáticos)
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT gen_random_uuid()::text, m.id, 'editor', true
FROM "Module" m
WHERE m."slug" IN ('finance_import_view', 'finance_omie_view')
AND NOT EXISTS (
  SELECT 1 FROM "ModuleRole" x WHERE x."moduleId" = m.id AND x."role" = 'editor'
);
