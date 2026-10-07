-- CreateTable
CREATE TABLE "EventTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "ticketLotId" TEXT,
    "lineIndex" INTEGER NOT NULL,
    "ticketCode" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "orderNumber" TEXT NOT NULL,
    "ticketTypeName" TEXT NOT NULL,
    "lotName" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "holderEmail" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "EventTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventTicket_qrToken_key" ON "EventTicket"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "EventTicket_orderItemId_lineIndex_key" ON "EventTicket"("orderItemId", "lineIndex");

-- CreateIndex
CREATE UNIQUE INDEX "EventTicket_tenantId_ticketCode_key" ON "EventTicket"("tenantId", "ticketCode");

-- CreateIndex
CREATE INDEX "EventTicket_tenantId_orderId_idx" ON "EventTicket"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "EventTicket_tenantId_eventId_idx" ON "EventTicket"("tenantId", "eventId");

-- CreateIndex
CREATE INDEX "EventTicket_tenantId_status_idx" ON "EventTicket"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "EventTicketOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "EventTicketOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "EventTicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_ticketLotId_fkey" FOREIGN KEY ("ticketLotId") REFERENCES "EventTicketLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
