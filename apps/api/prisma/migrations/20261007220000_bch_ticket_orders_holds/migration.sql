-- BCH Fase 2.2 — pedidos, holds e itens snapshot

CREATE TABLE "EventTicketOrderNumberSeq" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventTicketOrderNumberSeq_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventTicketOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerDocument" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "holdExpiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTicketOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventTicketOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "ticketLotId" TEXT,
    "ticketTypeName" TEXT NOT NULL,
    "lotName" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "EventTicketOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventTicketOrderNumberSeq_tenantId_year_key" ON "EventTicketOrderNumberSeq"("tenantId", "year");
CREATE INDEX "EventTicketOrderNumberSeq_tenantId_idx" ON "EventTicketOrderNumberSeq"("tenantId");

CREATE UNIQUE INDEX "EventTicketOrder_tenantId_orderNumber_key" ON "EventTicketOrder"("tenantId", "orderNumber");
CREATE INDEX "EventTicketOrder_tenantId_eventId_idx" ON "EventTicketOrder"("tenantId", "eventId");
CREATE INDEX "EventTicketOrder_tenantId_status_idx" ON "EventTicketOrder"("tenantId", "status");
CREATE INDEX "EventTicketOrder_tenantId_createdAt_idx" ON "EventTicketOrder"("tenantId", "createdAt");
CREATE INDEX "EventTicketOrder_holdExpiresAt_idx" ON "EventTicketOrder"("holdExpiresAt");

CREATE INDEX "EventTicketOrderItem_orderId_idx" ON "EventTicketOrderItem"("orderId");
CREATE INDEX "EventTicketOrderItem_ticketTypeId_idx" ON "EventTicketOrderItem"("ticketTypeId");
CREATE INDEX "EventTicketOrderItem_ticketLotId_idx" ON "EventTicketOrderItem"("ticketLotId");

ALTER TABLE "EventTicketOrderNumberSeq" ADD CONSTRAINT "EventTicketOrderNumberSeq_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventTicketOrder" ADD CONSTRAINT "EventTicketOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventTicketOrder" ADD CONSTRAINT "EventTicketOrder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventTicketOrder" ADD CONSTRAINT "EventTicketOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventTicketOrderItem" ADD CONSTRAINT "EventTicketOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "EventTicketOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventTicketOrderItem" ADD CONSTRAINT "EventTicketOrderItem_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "EventTicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventTicketOrderItem" ADD CONSTRAINT "EventTicketOrderItem_ticketLotId_fkey" FOREIGN KEY ("ticketLotId") REFERENCES "EventTicketLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
