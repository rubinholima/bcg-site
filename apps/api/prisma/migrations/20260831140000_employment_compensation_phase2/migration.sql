-- CreateTable
CREATE TABLE "EmploymentCompensationItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "legalDocumentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentCompensationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentSalaryRevision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentSalaryRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmploymentCompensationItem_tenantId_idx" ON "EmploymentCompensationItem"("tenantId");

-- CreateIndex
CREATE INDEX "EmploymentCompensationItem_employmentId_idx" ON "EmploymentCompensationItem"("employmentId");

-- CreateIndex
CREATE INDEX "EmploymentCompensationItem_employmentId_kind_idx" ON "EmploymentCompensationItem"("employmentId", "kind");

-- CreateIndex
CREATE INDEX "EmploymentCompensationItem_employmentId_kind_effectiveFrom_idx" ON "EmploymentCompensationItem"("employmentId", "kind", "effectiveFrom");

-- CreateIndex
CREATE INDEX "EmploymentSalaryRevision_tenantId_idx" ON "EmploymentSalaryRevision"("tenantId");

-- CreateIndex
CREATE INDEX "EmploymentSalaryRevision_employmentId_idx" ON "EmploymentSalaryRevision"("employmentId");

-- CreateIndex
CREATE INDEX "EmploymentSalaryRevision_employmentId_effectiveFrom_idx" ON "EmploymentSalaryRevision"("employmentId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "EmploymentCompensationItem" ADD CONSTRAINT "EmploymentCompensationItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentCompensationItem" ADD CONSTRAINT "EmploymentCompensationItem_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentCompensationItem" ADD CONSTRAINT "EmploymentCompensationItem_legalDocumentId_fkey" FOREIGN KEY ("legalDocumentId") REFERENCES "LegalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentSalaryRevision" ADD CONSTRAINT "EmploymentSalaryRevision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentSalaryRevision" ADD CONSTRAINT "EmploymentSalaryRevision_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
