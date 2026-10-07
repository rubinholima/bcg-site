-- BCH Phase 3.2 — token público + idempotência de checkout

ALTER TABLE "EventTicketOrder" ADD COLUMN "publicAccessToken" TEXT;
ALTER TABLE "EventTicketOrder" ADD COLUMN "checkoutIdempotencyKey" TEXT;

CREATE UNIQUE INDEX "EventTicketOrder_publicAccessToken_key" ON "EventTicketOrder"("publicAccessToken");
CREATE UNIQUE INDEX "EventTicketOrder_tenantId_checkoutIdempotencyKey_key" ON "EventTicketOrder"("tenantId", "checkoutIdempotencyKey");
