-- Finance Foundation CUP360: ownership/origin, currency, audit, soft cancel support.
-- Backfill currency: BRL (comportamento histórico do Financeiro ADM; não assume moeda por tenant nesta etapa).
-- Backfill ownership: native/manual; projeções existentes via parcela de negociação.

ALTER TABLE "FinanceiroLancamento" ADD COLUMN "ownershipKind" TEXT NOT NULL DEFAULT 'native';
ALTER TABLE "FinanceiroLancamento" ADD COLUMN "sourceModule" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'BRL';
ALTER TABLE "FinanceiroLancamento" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "FinanceiroLancamento" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "FinanceiroLancamento" ADD COLUMN "updatedByUserId" TEXT;

UPDATE "FinanceiroLancamento"
SET "ownershipKind" = 'native',
    "sourceModule" = 'financeiro',
    "sourceType" = 'manual'
WHERE "sourceModule" IS NULL;

UPDATE "FinanceiroLancamento" fl
SET "ownershipKind" = 'projection',
    "sourceModule" = 'player_negotiations',
    "sourceType" = 'installment',
    "sourceId" = pni.id
FROM "PlayerNegotiationInstallment" pni
WHERE pni."financeiroLancamentoId" = fl.id;

CREATE UNIQUE INDEX "FinanceiroLancamento_tenantId_sourceModule_sourceType_sourceId_key"
ON "FinanceiroLancamento"("tenantId", "sourceModule", "sourceType", "sourceId");

CREATE INDEX "FinanceiroLancamento_tenantId_ownershipKind_idx"
ON "FinanceiroLancamento"("tenantId", "ownershipKind");
