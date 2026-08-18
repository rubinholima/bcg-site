-- CreateTable
CREATE TABLE "NursingDiagnosis" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NursingDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingTreatment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'medicamento',
    "productId" TEXT,
    "defaultUnit" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NursingTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "category" TEXT,
    "attendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symptoms" TEXT,
    "nurseStaffId" TEXT,
    "nurseName" TEXT,
    "estimatedDays" INTEGER,
    "estimatedEndDate" TIMESTAMP(3),
    "treatmentNotes" TEXT,
    "attachments" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "endedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NursingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingSessionDiagnosis" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "diagnosisId" TEXT,
    "diagnosisLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NursingSessionDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingSessionTreatment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "treatmentId" TEXT,
    "treatmentLabel" TEXT,
    "productId" TEXT,
    "quantityUsed" DOUBLE PRECISION,
    "stockMovementId" TEXT,
    "deductStock" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "NursingSessionTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NursingDiagnosis_name_key" ON "NursingDiagnosis"("name");

-- CreateIndex
CREATE INDEX "NursingDiagnosis_active_idx" ON "NursingDiagnosis"("active");

-- CreateIndex
CREATE INDEX "NursingTreatment_active_idx" ON "NursingTreatment"("active");

-- CreateIndex
CREATE INDEX "NursingTreatment_productId_idx" ON "NursingTreatment"("productId");

-- CreateIndex
CREATE INDEX "NursingSession_tenantId_status_idx" ON "NursingSession"("tenantId", "status");

-- CreateIndex
CREATE INDEX "NursingSession_playerId_status_idx" ON "NursingSession"("playerId", "status");

-- CreateIndex
CREATE INDEX "NursingSession_attendedAt_idx" ON "NursingSession"("attendedAt");

-- CreateIndex
CREATE INDEX "NursingSessionDiagnosis_sessionId_idx" ON "NursingSessionDiagnosis"("sessionId");

-- CreateIndex
CREATE INDEX "NursingSessionTreatment_sessionId_idx" ON "NursingSessionTreatment"("sessionId");

-- CreateIndex
CREATE INDEX "NursingSessionTreatment_productId_idx" ON "NursingSessionTreatment"("productId");

-- AddForeignKey
ALTER TABLE "NursingTreatment" ADD CONSTRAINT "NursingTreatment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingSession" ADD CONSTRAINT "NursingSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingSession" ADD CONSTRAINT "NursingSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingSessionDiagnosis" ADD CONSTRAINT "NursingSessionDiagnosis_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "NursingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingSessionDiagnosis" ADD CONSTRAINT "NursingSessionDiagnosis_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "NursingDiagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingSessionTreatment" ADD CONSTRAINT "NursingSessionTreatment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "NursingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingSessionTreatment" ADD CONSTRAINT "NursingSessionTreatment_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "NursingTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingSessionTreatment" ADD CONSTRAINT "NursingSessionTreatment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
