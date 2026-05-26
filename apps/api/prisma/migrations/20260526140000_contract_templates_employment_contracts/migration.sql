-- Contratos base (Jurídico) + instâncias no vínculo RH

CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileUrl" TEXT,
    "pdfFieldNames" JSONB,
    "fieldMapping" JSONB,
    "signaturePage" INTEGER NOT NULL DEFAULT 1,
    "pageCount" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmploymentContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileUrl" TEXT,
    "signedFileKey" TEXT,
    "signedFileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "helloSignRequestId" TEXT,
    "signerEmail" TEXT,
    "signerName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmploymentContract_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContractTemplate_tenantId_idx" ON "ContractTemplate"("tenantId");
CREATE INDEX "ContractTemplate_type_idx" ON "ContractTemplate"("type");
CREATE INDEX "ContractTemplate_active_idx" ON "ContractTemplate"("active");

CREATE INDEX "EmploymentContract_tenantId_idx" ON "EmploymentContract"("tenantId");
CREATE INDEX "EmploymentContract_employmentId_idx" ON "EmploymentContract"("employmentId");
CREATE INDEX "EmploymentContract_templateId_idx" ON "EmploymentContract"("templateId");
CREATE INDEX "EmploymentContract_status_idx" ON "EmploymentContract"("status");

ALTER TABLE "ContractTemplate" ADD CONSTRAINT "ContractTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
