-- CreateTable
CREATE TABLE "BchOperationalAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT,
    "bookingId" TEXT,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "deduplicationKey" TEXT NOT NULL,
    "actionUrl" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchOperationalAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BchOperationalAlert_tenantId_deduplicationKey_key" ON "BchOperationalAlert"("tenantId", "deduplicationKey");

-- CreateIndex
CREATE INDEX "BchOperationalAlert_tenantId_status_idx" ON "BchOperationalAlert"("tenantId", "status");

-- CreateIndex
CREATE INDEX "BchOperationalAlert_tenantId_severity_idx" ON "BchOperationalAlert"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "BchOperationalAlert_tenantId_alertType_idx" ON "BchOperationalAlert"("tenantId", "alertType");

-- CreateIndex
CREATE INDEX "BchOperationalAlert_tenantId_eventId_idx" ON "BchOperationalAlert"("tenantId", "eventId");

-- CreateIndex
CREATE INDEX "BchOperationalAlert_tenantId_detectedAt_idx" ON "BchOperationalAlert"("tenantId", "detectedAt");

-- AddForeignKey
ALTER TABLE "BchOperationalAlert" ADD CONSTRAINT "BchOperationalAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchOperationalAlert" ADD CONSTRAINT "BchOperationalAlert_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchOperationalAlert" ADD CONSTRAINT "BchOperationalAlert_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "VenueBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BchOperationalAlert" ADD CONSTRAINT "BchOperationalAlert_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
