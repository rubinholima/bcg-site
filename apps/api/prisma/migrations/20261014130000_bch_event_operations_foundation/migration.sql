-- BCH event operations foundation (additive)

CREATE TABLE "BchEventScheduleItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "locationLabel" TEXT,
    "responsibleName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchEventScheduleItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BchEventStaffAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "employeeId" TEXT,
    "userId" TEXT,
    "contractorName" TEXT,
    "supplierId" TEXT,
    "roleLabel" TEXT NOT NULL,
    "responsibility" TEXT,
    "locationLabel" TEXT,
    "plannedStartAt" TIMESTAMP(3),
    "plannedEndAt" TIMESTAMP(3),
    "actualStartAt" TIMESTAMP(3),
    "actualEndAt" TIMESTAMP(3),
    "breakMinutes" INTEGER,
    "rateType" TEXT,
    "rateAmount" DECIMAL(14,4),
    "rateCurrency" TEXT,
    "plannedCost" DECIMAL(14,4),
    "actualCost" DECIMAL(14,4),
    "status" TEXT NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchEventStaffAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BchEventServiceCommitment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "catalogServiceId" TEXT,
    "supplierId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,4),
    "unitLabel" TEXT,
    "contractedAmount" DECIMAL(14,4),
    "plannedCost" DECIMAL(14,4),
    "actualCost" DECIMAL(14,4),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "responsibleName" TEXT,
    "operationalStatus" TEXT NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchEventServiceCommitment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BchCheckinStation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deviceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchCheckinStation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BchCheckinSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "operatorUserId" TEXT,
    "deviceLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchCheckinSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BchPosCashSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "operatorUserId" TEXT,
    "terminalLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openingFloat" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "declaredCash" DECIMAL(14,4),
    "declaredCard" DECIMAL(14,4),
    "declaredPix" DECIMAL(14,4),
    "declaredOther" DECIMAL(14,4),
    "expectedTotal" DECIMAL(14,4),
    "varianceAmount" DECIMAL(14,4),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchPosCashSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EventTicketCheckin" ADD COLUMN "stationId" TEXT;
ALTER TABLE "EventTicketCheckin" ADD COLUMN "sessionId" TEXT;

ALTER TABLE "BchBarSale" ADD COLUMN "cashSessionId" TEXT;

CREATE INDEX "BchEventScheduleItem_tenantId_eventId_startsAt_idx" ON "BchEventScheduleItem"("tenantId", "eventId", "startsAt");
CREATE INDEX "BchEventScheduleItem_tenantId_eventId_status_idx" ON "BchEventScheduleItem"("tenantId", "eventId", "status");

CREATE INDEX "BchEventStaffAssignment_tenantId_eventId_status_idx" ON "BchEventStaffAssignment"("tenantId", "eventId", "status");
CREATE INDEX "BchEventStaffAssignment_tenantId_eventId_plannedStartAt_idx" ON "BchEventStaffAssignment"("tenantId", "eventId", "plannedStartAt");
CREATE INDEX "BchEventStaffAssignment_employeeId_idx" ON "BchEventStaffAssignment"("employeeId");

CREATE INDEX "BchEventServiceCommitment_tenantId_eventId_operationalStatus_idx" ON "BchEventServiceCommitment"("tenantId", "eventId", "operationalStatus");
CREATE INDEX "BchEventServiceCommitment_supplierId_idx" ON "BchEventServiceCommitment"("supplierId");

CREATE INDEX "BchCheckinStation_tenantId_eventId_active_idx" ON "BchCheckinStation"("tenantId", "eventId", "active");

CREATE INDEX "BchCheckinSession_tenantId_eventId_status_idx" ON "BchCheckinSession"("tenantId", "eventId", "status");
CREATE INDEX "BchCheckinSession_stationId_status_idx" ON "BchCheckinSession"("stationId", "status");

CREATE INDEX "BchPosCashSession_tenantId_eventId_status_idx" ON "BchPosCashSession"("tenantId", "eventId", "status");
CREATE INDEX "BchPosCashSession_tenantId_locationId_status_idx" ON "BchPosCashSession"("tenantId", "locationId", "status");

CREATE INDEX "EventTicketCheckin_sessionId_createdAt_idx" ON "EventTicketCheckin"("sessionId", "createdAt");
CREATE INDEX "EventTicketCheckin_stationId_createdAt_idx" ON "EventTicketCheckin"("stationId", "createdAt");

CREATE INDEX "BchBarSale_cashSessionId_idx" ON "BchBarSale"("cashSessionId");

ALTER TABLE "BchEventScheduleItem" ADD CONSTRAINT "BchEventScheduleItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BchEventScheduleItem" ADD CONSTRAINT "BchEventScheduleItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BchEventStaffAssignment" ADD CONSTRAINT "BchEventStaffAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BchEventStaffAssignment" ADD CONSTRAINT "BchEventStaffAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BchEventStaffAssignment" ADD CONSTRAINT "BchEventStaffAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BchEventStaffAssignment" ADD CONSTRAINT "BchEventStaffAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BchEventStaffAssignment" ADD CONSTRAINT "BchEventStaffAssignment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BchEventServiceCommitment" ADD CONSTRAINT "BchEventServiceCommitment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BchEventServiceCommitment" ADD CONSTRAINT "BchEventServiceCommitment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BchEventServiceCommitment" ADD CONSTRAINT "BchEventServiceCommitment_catalogServiceId_fkey" FOREIGN KEY ("catalogServiceId") REFERENCES "VenueCatalogService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BchEventServiceCommitment" ADD CONSTRAINT "BchEventServiceCommitment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BchCheckinStation" ADD CONSTRAINT "BchCheckinStation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BchCheckinStation" ADD CONSTRAINT "BchCheckinStation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BchCheckinSession" ADD CONSTRAINT "BchCheckinSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BchCheckinSession" ADD CONSTRAINT "BchCheckinSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BchCheckinSession" ADD CONSTRAINT "BchCheckinSession_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "BchCheckinStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchCheckinSession" ADD CONSTRAINT "BchCheckinSession_operatorUserId_fkey" FOREIGN KEY ("operatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BchPosCashSession" ADD CONSTRAINT "BchPosCashSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BchPosCashSession" ADD CONSTRAINT "BchPosCashSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BchPosCashSession" ADD CONSTRAINT "BchPosCashSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BchBarInventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BchPosCashSession" ADD CONSTRAINT "BchPosCashSession_operatorUserId_fkey" FOREIGN KEY ("operatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventTicketCheckin" ADD CONSTRAINT "EventTicketCheckin_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "BchCheckinStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventTicketCheckin" ADD CONSTRAINT "EventTicketCheckin_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BchCheckinSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BchBarSale" ADD CONSTRAINT "BchBarSale_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "BchPosCashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
