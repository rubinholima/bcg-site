-- Negociações comerciais de atletas + vínculo financeiro

CREATE TABLE "PlayerNegotiation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "negotiationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "counterpartyName" TEXT NOT NULL,
    "visitingTeamId" TEXT,
    "negotiatedPercentage" DECIMAL(6,2),
    "retainedPercentage" DECIMAL(6,2),
    "totalValue" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "negotiatedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "loanEndDate" TIMESTAMP(3),
    "hasPurchaseOption" BOOLEAN NOT NULL DEFAULT false,
    "purchaseOptionDeadline" TIMESTAMP(3),
    "purchaseOptionTerms" TEXT,
    "futureAcquisitionRights" JSONB,
    "paymentTermsSummary" TEXT,
    "clauses" TEXT,
    "notes" TEXT,
    "responsibleUserId" TEXT,
    "responsibleName" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerNegotiation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerNegotiationInstallment" (
    "id" TEXT NOT NULL,
    "negotiationId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "settledAt" TIMESTAMP(3),
    "financeiroLancamentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerNegotiationInstallment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerNegotiationDocument" (
    "id" TEXT NOT NULL,
    "negotiationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT,
    "legalDocumentId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedByUserId" TEXT,

    CONSTRAINT "PlayerNegotiationDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerNegotiationAuditLog" (
    "id" TEXT NOT NULL,
    "negotiationId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "PlayerNegotiationAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerNegotiationInstallment_financeiroLancamentoId_key" ON "PlayerNegotiationInstallment"("financeiroLancamentoId");
CREATE UNIQUE INDEX "PlayerNegotiationInstallment_negotiationId_sequence_key" ON "PlayerNegotiationInstallment"("negotiationId", "sequence");
CREATE INDEX "PlayerNegotiation_tenantId_status_idx" ON "PlayerNegotiation"("tenantId", "status");
CREATE INDEX "PlayerNegotiation_tenantId_negotiationType_idx" ON "PlayerNegotiation"("tenantId", "negotiationType");
CREATE INDEX "PlayerNegotiation_playerId_status_idx" ON "PlayerNegotiation"("playerId", "status");
CREATE INDEX "PlayerNegotiation_tenantId_negotiatedAt_idx" ON "PlayerNegotiation"("tenantId", "negotiatedAt");
CREATE INDEX "PlayerNegotiation_counterpartyName_idx" ON "PlayerNegotiation"("counterpartyName");
CREATE INDEX "PlayerNegotiationInstallment_negotiationId_idx" ON "PlayerNegotiationInstallment"("negotiationId");
CREATE INDEX "PlayerNegotiationInstallment_dueDate_idx" ON "PlayerNegotiationInstallment"("dueDate");
CREATE INDEX "PlayerNegotiationInstallment_status_idx" ON "PlayerNegotiationInstallment"("status");
CREATE INDEX "PlayerNegotiationDocument_negotiationId_idx" ON "PlayerNegotiationDocument"("negotiationId");
CREATE INDEX "PlayerNegotiationAuditLog_negotiationId_at_idx" ON "PlayerNegotiationAuditLog"("negotiationId", "at");

ALTER TABLE "PlayerNegotiation" ADD CONSTRAINT "PlayerNegotiation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerNegotiation" ADD CONSTRAINT "PlayerNegotiation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerNegotiation" ADD CONSTRAINT "PlayerNegotiation_visitingTeamId_fkey" FOREIGN KEY ("visitingTeamId") REFERENCES "VisitingTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlayerNegotiationInstallment" ADD CONSTRAINT "PlayerNegotiationInstallment_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "PlayerNegotiation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerNegotiationInstallment" ADD CONSTRAINT "PlayerNegotiationInstallment_financeiroLancamentoId_fkey" FOREIGN KEY ("financeiroLancamentoId") REFERENCES "FinanceiroLancamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlayerNegotiationDocument" ADD CONSTRAINT "PlayerNegotiationDocument_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "PlayerNegotiation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerNegotiationAuditLog" ADD CONSTRAINT "PlayerNegotiationAuditLog_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "PlayerNegotiation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea", "impliesSlug")
SELECT 'mod-cad-jogadores-negociados', 'cad_jogadores_negociados', 'Atletas negociados', 9980, 'futebol_dados_sensiveis', NULL
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'cad_jogadores_negociados');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-neg-' || pr."slug", m."id", pr."slug", false
FROM "Module" m
CROSS JOIN "PlatformRole" pr
WHERE m."slug" = 'cad_jogadores_negociados'
  AND pr."includeInMatrix" = true
  AND pr."isActive" = true
  AND NOT EXISTS (
    SELECT 1 FROM "ModuleRole" mr
    WHERE mr."moduleId" = m."id" AND mr."role" = pr."slug"
  );

UPDATE "ModuleRole" mr
SET "canAccess" = true
FROM "Module" m
WHERE mr."moduleId" = m."id"
  AND m."slug" = 'cad_jogadores_negociados'
  AND mr."role" IN ('super_admin', 'company_admin', 'diretoria', 'editor', 'juridico', 'adm_financeiro');

-- Financeiro/Jurídico via customModuleAccess ou roles adicionais na matriz
