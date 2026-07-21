-- Categorias ADM de compras/estoque + precificação

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "purchasePrice" DECIMAL(12,2);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "currentPrice" DECIMAL(12,2);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "averagePrice" DECIMAL(12,2);

ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "unitPrice" DECIMAL(12,2);

-- Migra categorias antigas para as novas solicitadas pelo ADM
UPDATE "Product" SET "inventoryKind" = CASE
  WHEN "inventoryKind" = 'uniforme' THEN 'uniforme_futebol'
  WHEN "inventoryKind" = 'nutricao_hidratacao' THEN 'nutricao_suplementacao'
  WHEN "inventoryKind" = 'vestuario_lazer' THEN 'uniforme_apoio'
  WHEN "inventoryKind" = 'material_treino' THEN 'uso_consumo'
  WHEN "inventoryKind" = 'bola_equipamento' THEN 'produtos_manutencao'
  WHEN "inventoryKind" IN ('saude_fisioterapia', 'documental', 'geral') THEN 'uso_consumo'
  WHEN "inventoryKind" IN (
    'alimentacao',
    'nutricao_suplementacao',
    'alimentacao_viagem',
    'uniforme_apoio',
    'uniforme_futebol',
    'uniforme_adm',
    'produtos_limpeza',
    'produtos_manutencao',
    'uso_consumo'
  ) THEN "inventoryKind"
  ELSE 'uso_consumo'
END;
