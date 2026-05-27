-- CreateTable
CREATE TABLE "FootballAgendaEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmado',
    "travelLogisticsId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FootballAgendaEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FootballAgendaEntry_tenantId_startAt_idx" ON "FootballAgendaEntry"("tenantId", "startAt");

-- CreateIndex
CREATE INDEX "FootballAgendaEntry_travelLogisticsId_idx" ON "FootballAgendaEntry"("travelLogisticsId");

-- AddForeignKey
ALTER TABLE "FootballAgendaEntry" ADD CONSTRAINT "FootballAgendaEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootballAgendaEntry" ADD CONSTRAINT "FootballAgendaEntry_travelLogisticsId_fkey" FOREIGN KEY ("travelLogisticsId") REFERENCES "TravelLogistics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
