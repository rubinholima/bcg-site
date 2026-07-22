-- Categorias dinâmicas de produtos (Compras / Estoque)

CREATE TABLE "InventoryCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryCategory_tenantId_idx" ON "InventoryCategory"("tenantId");
CREATE INDEX "InventoryCategory_slug_idx" ON "InventoryCategory"("slug");
CREATE INDEX "InventoryCategory_isSystem_idx" ON "InventoryCategory"("isSystem");

CREATE UNIQUE INDEX "InventoryCategory_system_slug_key" ON "InventoryCategory"("slug") WHERE "isSystem" = true;
CREATE UNIQUE INDEX "InventoryCategory_tenant_slug_key" ON "InventoryCategory"("tenantId", "slug") WHERE "isSystem" = false;

ALTER TABLE "InventoryCategory" ADD CONSTRAINT "InventoryCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: categorias legadas + ADM + atalhos operacionais
INSERT INTO "InventoryCategory" ("id", "tenantId", "slug", "name", "sortOrder", "isSystem", "updatedAt") VALUES
  ('invcat_uniforme', NULL, 'uniforme', 'Uniforme & equipamento de jogo', 1, true, CURRENT_TIMESTAMP),
  ('invcat_material_treino', NULL, 'material_treino', 'Material de treino', 2, true, CURRENT_TIMESTAMP),
  ('invcat_bola_equipamento', NULL, 'bola_equipamento', 'Bolas & equipamentos de campo', 3, true, CURRENT_TIMESTAMP),
  ('invcat_nutricao_hidratacao', NULL, 'nutricao_hidratacao', 'Nutrição & hidratação', 4, true, CURRENT_TIMESTAMP),
  ('invcat_saude_fisioterapia', NULL, 'saude_fisioterapia', 'Saúde & fisioterapia', 5, true, CURRENT_TIMESTAMP),
  ('invcat_vestuario_lazer', NULL, 'vestuario_lazer', 'Vestuário & uso diário', 6, true, CURRENT_TIMESTAMP),
  ('invcat_documental', NULL, 'documental', 'Material institucional / documental', 7, true, CURRENT_TIMESTAMP),
  ('invcat_geral', NULL, 'geral', 'Geral / diversos', 8, true, CURRENT_TIMESTAMP),
  ('invcat_alimentacao', NULL, 'alimentacao', 'Alimentação', 101, true, CURRENT_TIMESTAMP),
  ('invcat_nutricao_suplementacao', NULL, 'nutricao_suplementacao', 'Nutrição e suplementação', 102, true, CURRENT_TIMESTAMP),
  ('invcat_alimentacao_viagem', NULL, 'alimentacao_viagem', 'Alimentação de viagem', 103, true, CURRENT_TIMESTAMP),
  ('invcat_uniforme_apoio', NULL, 'uniforme_apoio', 'Uniforme apoio', 104, true, CURRENT_TIMESTAMP),
  ('invcat_uniforme_futebol', NULL, 'uniforme_futebol', 'Uniforme futebol', 105, true, CURRENT_TIMESTAMP),
  ('invcat_uniforme_adm', NULL, 'uniforme_adm', 'Uniforme ADM', 106, true, CURRENT_TIMESTAMP),
  ('invcat_produtos_limpeza', NULL, 'produtos_limpeza', 'Produtos de limpeza', 107, true, CURRENT_TIMESTAMP),
  ('invcat_produtos_manutencao', NULL, 'produtos_manutencao', 'Produtos de manutenção', 108, true, CURRENT_TIMESTAMP),
  ('invcat_uso_consumo', NULL, 'uso_consumo', 'Uso e consumo (descartáveis)', 109, true, CURRENT_TIMESTAMP),
  ('invcat_uniforme_treino', NULL, 'uniforme_treino', 'Uniforme de treino', 201, true, CURRENT_TIMESTAMP),
  ('invcat_jogo', NULL, 'jogo', 'Jogo', 202, true, CURRENT_TIMESTAMP),
  ('invcat_saude', NULL, 'saude', 'Saúde', 203, true, CURRENT_TIMESTAMP),
  ('invcat_outros', NULL, 'outros', 'Outros', 204, true, CURRENT_TIMESTAMP);
