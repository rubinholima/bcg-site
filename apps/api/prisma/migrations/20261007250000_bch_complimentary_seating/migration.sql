-- AlterTable EventTicketing
ALTER TABLE "EventTicketing" ADD COLUMN "seatingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable EventComplimentaryAdmission
CREATE TABLE "EventComplimentaryAdmission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "ticketLotId" TEXT,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdByUserId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventComplimentaryAdmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable EventTicketTable
CREATE TABLE "EventTicketTable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "section" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTicketTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable EventTicketSeat
CREATE TABLE "EventTicketSeat" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tableId" TEXT,
    "section" TEXT,
    "rowLabel" TEXT,
    "seatLabel" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTicketSeat_pkey" PRIMARY KEY ("id")
);

-- AlterTable EventTicket
ALTER TABLE "EventTicket" ADD COLUMN "issuanceKey" TEXT;
ALTER TABLE "EventTicket" ADD COLUMN "admissionSource" TEXT NOT NULL DEFAULT 'paid_order';
ALTER TABLE "EventTicket" ADD COLUMN "complimentaryAdmissionId" TEXT;
ALTER TABLE "EventTicket" ADD COLUMN "tableId" TEXT;
ALTER TABLE "EventTicket" ADD COLUMN "seatId" TEXT;

UPDATE "EventTicket" SET "issuanceKey" = 'order_item:' || "orderItemId" || ':' || "lineIndex"::text WHERE "issuanceKey" IS NULL;

ALTER TABLE "EventTicket" ALTER COLUMN "issuanceKey" SET NOT NULL;
ALTER TABLE "EventTicket" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "EventTicket" ALTER COLUMN "orderItemId" DROP NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "EventTicket_orderItemId_lineIndex_key";

-- CreateIndex
CREATE UNIQUE INDEX "EventTicket_issuanceKey_key" ON "EventTicket"("issuanceKey");
CREATE UNIQUE INDEX "EventTicket_active_seat_key" ON "EventTicket"("seatId") WHERE "seatId" IS NOT NULL AND "status" IN ('valid', 'used');

CREATE INDEX "EventComplimentaryAdmission_tenantId_eventId_idx" ON "EventComplimentaryAdmission"("tenantId", "eventId");
CREATE INDEX "EventComplimentaryAdmission_tenantId_status_idx" ON "EventComplimentaryAdmission"("tenantId", "status");
CREATE UNIQUE INDEX "EventTicketTable_eventId_name_key" ON "EventTicketTable"("eventId", "name");
CREATE INDEX "EventTicketTable_tenantId_eventId_idx" ON "EventTicketTable"("tenantId", "eventId");
CREATE UNIQUE INDEX "EventTicketSeat_eventId_seatLabel_key" ON "EventTicketSeat"("eventId", "seatLabel");
CREATE INDEX "EventTicketSeat_tenantId_eventId_idx" ON "EventTicketSeat"("tenantId", "eventId");
CREATE INDEX "EventTicketSeat_tableId_idx" ON "EventTicketSeat"("tableId");
CREATE INDEX "EventTicket_complimentaryAdmissionId_idx" ON "EventTicket"("complimentaryAdmissionId");
CREATE INDEX "EventTicket_tableId_idx" ON "EventTicket"("tableId");
CREATE INDEX "EventTicket_seatId_idx" ON "EventTicket"("seatId");

-- AddForeignKey
ALTER TABLE "EventComplimentaryAdmission" ADD CONSTRAINT "EventComplimentaryAdmission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventComplimentaryAdmission" ADD CONSTRAINT "EventComplimentaryAdmission_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventComplimentaryAdmission" ADD CONSTRAINT "EventComplimentaryAdmission_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "EventTicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventComplimentaryAdmission" ADD CONSTRAINT "EventComplimentaryAdmission_ticketLotId_fkey" FOREIGN KEY ("ticketLotId") REFERENCES "EventTicketLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventComplimentaryAdmission" ADD CONSTRAINT "EventComplimentaryAdmission_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventTicketTable" ADD CONSTRAINT "EventTicketTable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventTicketTable" ADD CONSTRAINT "EventTicketTable_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventTicketSeat" ADD CONSTRAINT "EventTicketSeat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventTicketSeat" ADD CONSTRAINT "EventTicketSeat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventTicketSeat" ADD CONSTRAINT "EventTicketSeat_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "EventTicketTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_complimentaryAdmissionId_fkey" FOREIGN KEY ("complimentaryAdmissionId") REFERENCES "EventComplimentaryAdmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "EventTicketTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "EventTicketSeat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
