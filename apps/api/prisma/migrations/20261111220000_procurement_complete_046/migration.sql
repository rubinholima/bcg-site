-- PROMPT 046 — cotação manual, documentos, permissões granulares

ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "originKind" TEXT NOT NULL DEFAULT 'requisition';
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "quoteDeadline" TIMESTAMP(3);
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "currency" TEXT;
ALTER TABLE "PurchaseRequisition" ADD COLUMN IF NOT EXISTS "responsibleUserId" TEXT;

ALTER TABLE "SupplierDocument" ADD COLUMN IF NOT EXISTS "docType" TEXT;

CREATE INDEX IF NOT EXISTS "PurchaseRequisition_originKind_idx" ON "PurchaseRequisition"("originKind");

-- Módulos granulares de compras (adm_departamentos)
INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea", "impliesSlug")
SELECT gen_random_uuid()::text, v.slug, v.name, v.ord, 'adm_departamentos', NULL
FROM (VALUES
  ('compras_fornecedores_ver', 'Compras — ver fornecedores', 211),
  ('compras_fornecedores_gerir', 'Compras — gerir fornecedores', 212),
  ('compras_cotacoes_ver', 'Compras — ver cotações', 213),
  ('compras_cotacoes_gerir', 'Compras — gerir cotações', 214),
  ('compras_proposta_lancar', 'Compras — lançar proposta', 215),
  ('compras_vencedor_selecionar', 'Compras — selecionar vencedor', 216),
  ('compras_cotacao_aprovar', 'Compras — aprovar cotação', 217),
  ('compras_pedido_gerir', 'Compras — gerir pedidos', 218)
) AS v(slug, name, ord)
WHERE NOT EXISTS (SELECT 1 FROM "Module" m WHERE m."slug" = v.slug);

-- Quem já tem adm_compras recebe capacidades operacionais (exceto aprovar — continua financeiro/diretoria)
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT gen_random_uuid()::text, m.id, mr.role, true
FROM "Module" m
JOIN "Module" adm ON adm."slug" = 'adm_compras'
JOIN "ModuleRole" mr ON mr."moduleId" = adm.id AND mr."canAccess" = true
WHERE m."slug" IN (
  'compras_fornecedores_ver',
  'compras_fornecedores_gerir',
  'compras_cotacoes_ver',
  'compras_cotacoes_gerir',
  'compras_proposta_lancar',
  'compras_vencedor_selecionar',
  'compras_pedido_gerir'
)
AND NOT EXISTS (
  SELECT 1 FROM "ModuleRole" x WHERE x."moduleId" = m.id AND x."role" = mr.role
);

-- group_fornecedores → ver/gerir fornecedores
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT gen_random_uuid()::text, m.id, mr.role, true
FROM "Module" m
JOIN "Module" gf ON gf."slug" = 'group_fornecedores'
JOIN "ModuleRole" mr ON mr."moduleId" = gf.id AND mr."canAccess" = true
WHERE m."slug" IN ('compras_fornecedores_ver', 'compras_fornecedores_gerir')
AND NOT EXISTS (
  SELECT 1 FROM "ModuleRole" x WHERE x."moduleId" = m.id AND x."role" = mr.role
);

-- Aprovação: financeiro e diretoria
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT gen_random_uuid()::text, m.id, mr.role, true
FROM "Module" m
JOIN "Module" src ON src."slug" IN ('adm_financeiro', 'diretoria')
JOIN "ModuleRole" mr ON mr."moduleId" = src.id AND mr."canAccess" = true
WHERE m."slug" = 'compras_cotacao_aprovar'
AND NOT EXISTS (
  SELECT 1 FROM "ModuleRole" x WHERE x."moduleId" = m.id AND x."role" = mr.role
);
