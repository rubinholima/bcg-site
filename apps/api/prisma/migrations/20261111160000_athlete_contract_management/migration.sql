-- PROMPT 038 — gestão contratual/federativa do atleta (additive)

CREATE TABLE "AthleteContractType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteContractType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AthleteEvaluation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EM_AVALIACAO',
    "evaluationStartedAt" TIMESTAMP(3),
    "evaluationEndedAt" TIMESTAMP(3),
    "decision" TEXT,
    "decisionAt" TIMESTAMP(3),
    "responsibleUserId" TEXT,
    "responsibleEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AthleteFederativeProcess" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "documentsCheckedAt" TIMESTAMP(3),
    "registrationStatus" TEXT,
    "federationFeeAmount" DECIMAL(14,2),
    "transferFeeAmount" DECIMAL(14,2),
    "feeCurrency" TEXT DEFAULT 'BRL',
    "externalProcessNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "responsibleUserId" TEXT,
    "responsibleEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteFederativeProcess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AthleteProfessionalizationCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "effectiveDate" DATE,
    "employmentId" TEXT,
    "employmentContractId" TEXT,
    "salarySnapshot" JSONB,
    "requiredDocuments" JSONB,
    "responsibleUserId" TEXT,
    "responsibleEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteProfessionalizationCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AthleteContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "contractTypeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startDate" DATE,
    "endDate" DATE,
    "terminationDate" DATE,
    "clubName" TEXT,
    "originClubName" TEXT,
    "destinationClubName" TEXT,
    "responsibleUserId" TEXT,
    "responsibleDepartment" TEXT,
    "notes" TEXT,
    "financialTerms" JSONB,
    "signatureStatus" TEXT,
    "createdSource" TEXT NOT NULL DEFAULT 'native',
    "isLegacyImport" BOOLEAN NOT NULL DEFAULT false,
    "legacySourceLabel" TEXT,
    "legalDocumentId" TEXT,
    "employmentContractId" TEXT,
    "federativeProcessId" TEXT,
    "alertConfig" JSONB,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteContract_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AthleteContractParty" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "partyType" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "roleLabel" TEXT,
    "percentage" DECIMAL(7,4),
    "amount" DECIMAL(14,2),
    "currency" TEXT DEFAULT 'BRL',
    "notes" TEXT,
    "referenceId" TEXT,

    CONSTRAINT "AthleteContractParty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AthleteContractParticipation" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "participationType" TEXT NOT NULL,
    "partyName" TEXT,
    "percentage" DECIMAL(7,4),
    "amount" DECIMAL(14,2),
    "notes" TEXT,

    CONSTRAINT "AthleteContractParticipation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AthleteContractSignature" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "provider" TEXT,
    "envelopeReferenceId" TEXT,
    "athleteStatus" TEXT,
    "guardianStatus" TEXT,
    "clubStatus" TEXT,
    "otherPartiesStatus" TEXT,
    "overallStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "manualDocumentKey" TEXT,
    "notes" TEXT,

    CONSTRAINT "AthleteContractSignature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AthleteContractAttachment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT,
    "playerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "documentType" TEXT,
    "description" TEXT,
    "fileKey" TEXT NOT NULL,
    "fileUrl" TEXT,
    "legalDocumentId" TEXT,
    "issueDate" DATE,
    "expirationDate" DATE,
    "versionLabel" TEXT,
    "uploadedByUserId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteContractAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AthleteContractFinanceLink" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "referenceId" TEXT,
    "description" TEXT,
    "amount" DECIMAL(14,2),
    "status" TEXT,

    CONSTRAINT "AthleteContractFinanceLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AthleteContractAuditLog" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "changeType" TEXT NOT NULL,
    "after" JSONB,

    CONSTRAINT "AthleteContractAuditLog_pkey" PRIMARY KEY ("id")
);

-- Indexes & FKs
CREATE UNIQUE INDEX "AthleteContractType_tenantId_code_key" ON "AthleteContractType"("tenantId", "code");
CREATE INDEX "AthleteContractType_tenantId_active_idx" ON "AthleteContractType"("tenantId", "active");

CREATE INDEX "AthleteEvaluation_tenantId_playerId_idx" ON "AthleteEvaluation"("tenantId", "playerId");
CREATE INDEX "AthleteEvaluation_playerId_status_idx" ON "AthleteEvaluation"("playerId", "status");

CREATE INDEX "AthleteFederativeProcess_tenantId_playerId_idx" ON "AthleteFederativeProcess"("tenantId", "playerId");
CREATE INDEX "AthleteFederativeProcess_playerId_status_idx" ON "AthleteFederativeProcess"("playerId", "status");

CREATE INDEX "AthleteProfessionalizationCase_tenantId_playerId_idx" ON "AthleteProfessionalizationCase"("tenantId", "playerId");
CREATE INDEX "AthleteProfessionalizationCase_playerId_status_idx" ON "AthleteProfessionalizationCase"("playerId", "status");

CREATE INDEX "AthleteContract_tenantId_playerId_idx" ON "AthleteContract"("tenantId", "playerId");
CREATE INDEX "AthleteContract_tenantId_status_idx" ON "AthleteContract"("tenantId", "status");
CREATE INDEX "AthleteContract_playerId_status_idx" ON "AthleteContract"("playerId", "status");
CREATE INDEX "AthleteContract_contractTypeId_idx" ON "AthleteContract"("contractTypeId");
CREATE INDEX "AthleteContract_endDate_idx" ON "AthleteContract"("endDate");
CREATE INDEX "AthleteContract_legalDocumentId_idx" ON "AthleteContract"("legalDocumentId");
CREATE INDEX "AthleteContract_employmentContractId_idx" ON "AthleteContract"("employmentContractId");

CREATE INDEX "AthleteContractParty_contractId_idx" ON "AthleteContractParty"("contractId");
CREATE INDEX "AthleteContractParticipation_contractId_idx" ON "AthleteContractParticipation"("contractId");
CREATE INDEX "AthleteContractSignature_contractId_idx" ON "AthleteContractSignature"("contractId");
CREATE INDEX "AthleteContractAttachment_playerId_category_idx" ON "AthleteContractAttachment"("playerId", "category");
CREATE INDEX "AthleteContractAttachment_contractId_idx" ON "AthleteContractAttachment"("contractId");
CREATE INDEX "AthleteContractFinanceLink_contractId_idx" ON "AthleteContractFinanceLink"("contractId");
CREATE INDEX "AthleteContractAuditLog_contractId_at_idx" ON "AthleteContractAuditLog"("contractId", "at");

ALTER TABLE "AthleteContractType" ADD CONSTRAINT "AthleteContractType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteEvaluation" ADD CONSTRAINT "AthleteEvaluation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteEvaluation" ADD CONSTRAINT "AthleteEvaluation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteFederativeProcess" ADD CONSTRAINT "AthleteFederativeProcess_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteFederativeProcess" ADD CONSTRAINT "AthleteFederativeProcess_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteProfessionalizationCase" ADD CONSTRAINT "AthleteProfessionalizationCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteProfessionalizationCase" ADD CONSTRAINT "AthleteProfessionalizationCase_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteContract" ADD CONSTRAINT "AthleteContract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteContract" ADD CONSTRAINT "AthleteContract_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteContract" ADD CONSTRAINT "AthleteContract_contractTypeId_fkey" FOREIGN KEY ("contractTypeId") REFERENCES "AthleteContractType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AthleteContract" ADD CONSTRAINT "AthleteContract_legalDocumentId_fkey" FOREIGN KEY ("legalDocumentId") REFERENCES "LegalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AthleteContract" ADD CONSTRAINT "AthleteContract_employmentContractId_fkey" FOREIGN KEY ("employmentContractId") REFERENCES "EmploymentContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AthleteContract" ADD CONSTRAINT "AthleteContract_federativeProcessId_fkey" FOREIGN KEY ("federativeProcessId") REFERENCES "AthleteFederativeProcess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AthleteContractParty" ADD CONSTRAINT "AthleteContractParty_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "AthleteContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteContractParticipation" ADD CONSTRAINT "AthleteContractParticipation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "AthleteContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteContractSignature" ADD CONSTRAINT "AthleteContractSignature_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "AthleteContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteContractAttachment" ADD CONSTRAINT "AthleteContractAttachment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "AthleteContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AthleteContractAttachment" ADD CONSTRAINT "AthleteContractAttachment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteContractFinanceLink" ADD CONSTRAINT "AthleteContractFinanceLink_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "AthleteContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteContractAuditLog" ADD CONSTRAINT "AthleteContractAuditLog_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "AthleteContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
