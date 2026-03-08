-- CreateTable
CREATE TABLE "Psychologist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "crpOrEquivalent" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "tenantId" TEXT,
    "calendarBlocked" BOOLEAN NOT NULL DEFAULT false,
    "attendanceLog" JSONB,
    "performanceSheet" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Psychologist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Psychologist_tenantId_idx" ON "Psychologist"("tenantId");

-- AddForeignKey
ALTER TABLE "Psychologist" ADD CONSTRAINT "Psychologist_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
