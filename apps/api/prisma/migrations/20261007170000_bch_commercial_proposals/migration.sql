-- Boston City Hall — propostas comerciais (snapshot)

CREATE TABLE "VenueProposalNumberSeq" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VenueProposalNumberSeq_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueProposal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalNumber" TEXT NOT NULL,
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
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueProposalItem" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceServiceId" TEXT,
    "sourcePackageId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VenueProposalItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VenueProposalNumberSeq_tenantId_year_key" ON "VenueProposalNumberSeq"("tenantId", "year");
CREATE INDEX "VenueProposalNumberSeq_tenantId_idx" ON "VenueProposalNumberSeq"("tenantId");

CREATE UNIQUE INDEX "VenueProposal_tenantId_proposalNumber_key" ON "VenueProposal"("tenantId", "proposalNumber");
CREATE INDEX "VenueProposal_tenantId_idx" ON "VenueProposal"("tenantId");
CREATE INDEX "VenueProposal_tenantId_status_idx" ON "VenueProposal"("tenantId", "status");
CREATE INDEX "VenueProposal_pipelineLeadId_idx" ON "VenueProposal"("pipelineLeadId");
CREATE INDEX "VenueProposal_bookingId_idx" ON "VenueProposal"("bookingId");
CREATE INDEX "VenueProposal_eventDate_idx" ON "VenueProposal"("eventDate");
CREATE INDEX "VenueProposal_updatedAt_idx" ON "VenueProposal"("updatedAt");

CREATE INDEX "VenueProposalItem_proposalId_idx" ON "VenueProposalItem"("proposalId");
CREATE INDEX "VenueProposalItem_sourceServiceId_idx" ON "VenueProposalItem"("sourceServiceId");
CREATE INDEX "VenueProposalItem_sourcePackageId_idx" ON "VenueProposalItem"("sourcePackageId");

ALTER TABLE "VenueProposalNumberSeq" ADD CONSTRAINT "VenueProposalNumberSeq_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VenueProposal" ADD CONSTRAINT "VenueProposal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VenueProposal" ADD CONSTRAINT "VenueProposal_pipelineLeadId_fkey" FOREIGN KEY ("pipelineLeadId") REFERENCES "VenuePipelineLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VenueProposal" ADD CONSTRAINT "VenueProposal_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "VenueBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VenueProposalItem" ADD CONSTRAINT "VenueProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "VenueProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueProposalItem" ADD CONSTRAINT "VenueProposalItem_sourceServiceId_fkey" FOREIGN KEY ("sourceServiceId") REFERENCES "VenueCatalogService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VenueProposalItem" ADD CONSTRAINT "VenueProposalItem_sourcePackageId_fkey" FOREIGN KEY ("sourcePackageId") REFERENCES "VenueCatalogPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
