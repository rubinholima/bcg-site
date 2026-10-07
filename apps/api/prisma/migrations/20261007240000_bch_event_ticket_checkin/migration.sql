-- CreateTable
CREATE TABLE "EventTicketCheckin" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketId" TEXT,
    "operatorUserId" TEXT,
    "result" TEXT NOT NULL,
    "stationLabel" TEXT,
    "credentialFingerprint" TEXT,
    "ticketCode" TEXT,
    "ticketTypeName" TEXT,
    "holderName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTicketCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventTicketCheckin_tenantId_eventId_createdAt_idx" ON "EventTicketCheckin"("tenantId", "eventId", "createdAt");

-- CreateIndex
CREATE INDEX "EventTicketCheckin_ticketId_createdAt_idx" ON "EventTicketCheckin"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "EventTicketCheckin_tenantId_createdAt_idx" ON "EventTicketCheckin"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "EventTicketCheckin" ADD CONSTRAINT "EventTicketCheckin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicketCheckin" ADD CONSTRAINT "EventTicketCheckin_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicketCheckin" ADD CONSTRAINT "EventTicketCheckin_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "EventTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicketCheckin" ADD CONSTRAINT "EventTicketCheckin_operatorUserId_fkey" FOREIGN KEY ("operatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
