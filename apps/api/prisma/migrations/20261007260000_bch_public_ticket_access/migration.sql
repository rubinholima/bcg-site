-- BCH Phase 3.3 — referência pública de ingresso, magic link e sessão My Tickets

ALTER TABLE "EventTicket" ADD COLUMN "publicTicketRef" TEXT;

CREATE UNIQUE INDEX "EventTicket_publicTicketRef_key" ON "EventTicket"("publicTicketRef");

ALTER TABLE "EventTicketOrder" ADD COLUMN "confirmationEmailSentAt" TIMESTAMP(3);

CREATE TABLE "BchMyTicketsMagicLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BchMyTicketsMagicLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BchMyTicketsMagicLink_tokenHash_key" ON "BchMyTicketsMagicLink"("tokenHash");
CREATE INDEX "BchMyTicketsMagicLink_tenantId_emailNormalized_createdAt_idx" ON "BchMyTicketsMagicLink"("tenantId", "emailNormalized", "createdAt");
CREATE INDEX "BchMyTicketsMagicLink_expiresAt_idx" ON "BchMyTicketsMagicLink"("expiresAt");

CREATE TABLE "BchMyTicketsSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BchMyTicketsSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BchMyTicketsSession_sessionTokenHash_key" ON "BchMyTicketsSession"("sessionTokenHash");
CREATE INDEX "BchMyTicketsSession_tenantId_emailNormalized_idx" ON "BchMyTicketsSession"("tenantId", "emailNormalized");
CREATE INDEX "BchMyTicketsSession_expiresAt_idx" ON "BchMyTicketsSession"("expiresAt");

ALTER TABLE "BchMyTicketsMagicLink" ADD CONSTRAINT "BchMyTicketsMagicLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BchMyTicketsSession" ADD CONSTRAINT "BchMyTicketsSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
