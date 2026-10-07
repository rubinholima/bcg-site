-- Boston City Hall — contratos comerciais (snapshot da proposta aceita)

CREATE TABLE "VenueContractNumberSeq" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VenueContractNumberSeq_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "pipelineLeadId" TEXT,
    "bookingId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "companyName" TEXT,
    "eventType" TEXT,
    "eventDate" TIMESTAMP(3),
    "guestCount" INTEGER,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "terms" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "documentKey" TEXT,
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueContract_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueContractItem" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "sourceProposalItemId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VenueContractItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VenueContractNumberSeq_tenantId_year_key" ON "VenueContractNumberSeq"("tenantId", "year");
CREATE INDEX "VenueContractNumberSeq_tenantId_idx" ON "VenueContractNumberSeq"("tenantId");

CREATE UNIQUE INDEX "VenueContract_proposalId_key" ON "VenueContract"("proposalId");
CREATE UNIQUE INDEX "VenueContract_tenantId_contractNumber_key" ON "VenueContract"("tenantId", "contractNumber");
CREATE INDEX "VenueContract_tenantId_idx" ON "VenueContract"("tenantId");
CREATE INDEX "VenueContract_tenantId_status_idx" ON "VenueContract"("tenantId", "status");
CREATE INDEX "VenueContract_pipelineLeadId_idx" ON "VenueContract"("pipelineLeadId");
CREATE INDEX "VenueContract_bookingId_idx" ON "VenueContract"("bookingId");
CREATE INDEX "VenueContract_updatedAt_idx" ON "VenueContract"("updatedAt");

CREATE INDEX "VenueContractItem_contractId_idx" ON "VenueContractItem"("contractId");
CREATE INDEX "VenueContractItem_sourceProposalItemId_idx" ON "VenueContractItem"("sourceProposalItemId");

ALTER TABLE "VenueContractNumberSeq" ADD CONSTRAINT "VenueContractNumberSeq_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VenueContract" ADD CONSTRAINT "VenueContract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VenueContract" ADD CONSTRAINT "VenueContract_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "VenueProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VenueContract" ADD CONSTRAINT "VenueContract_pipelineLeadId_fkey" FOREIGN KEY ("pipelineLeadId") REFERENCES "VenuePipelineLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VenueContract" ADD CONSTRAINT "VenueContract_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "VenueBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VenueContractItem" ADD CONSTRAINT "VenueContractItem_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "VenueContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueContractItem" ADD CONSTRAINT "VenueContractItem_sourceProposalItemId_fkey" FOREIGN KEY ("sourceProposalItemId") REFERENCES "VenueProposalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
