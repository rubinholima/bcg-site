-- Boston City Hall — contas a receber e pagamentos

CREATE TABLE "VenueReceivable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "originalAmount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueReceivable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueReceivableInstallment" (
    "id" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "label" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "VenueReceivableInstallment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueReceivablePayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueReceivablePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VenueReceivable_contractId_key" ON "VenueReceivable"("contractId");
CREATE INDEX "VenueReceivable_tenantId_idx" ON "VenueReceivable"("tenantId");
CREATE INDEX "VenueReceivable_tenantId_status_idx" ON "VenueReceivable"("tenantId", "status");
CREATE INDEX "VenueReceivable_updatedAt_idx" ON "VenueReceivable"("updatedAt");

CREATE UNIQUE INDEX "VenueReceivableInstallment_receivableId_sequence_key" ON "VenueReceivableInstallment"("receivableId", "sequence");
CREATE INDEX "VenueReceivableInstallment_receivableId_idx" ON "VenueReceivableInstallment"("receivableId");
CREATE INDEX "VenueReceivableInstallment_dueDate_idx" ON "VenueReceivableInstallment"("dueDate");

CREATE INDEX "VenueReceivablePayment_tenantId_idx" ON "VenueReceivablePayment"("tenantId");
CREATE INDEX "VenueReceivablePayment_installmentId_idx" ON "VenueReceivablePayment"("installmentId");
CREATE INDEX "VenueReceivablePayment_paidAt_idx" ON "VenueReceivablePayment"("paidAt");

ALTER TABLE "VenueReceivable" ADD CONSTRAINT "VenueReceivable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VenueReceivable" ADD CONSTRAINT "VenueReceivable_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "VenueContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VenueReceivableInstallment" ADD CONSTRAINT "VenueReceivableInstallment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "VenueReceivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VenueReceivablePayment" ADD CONSTRAINT "VenueReceivablePayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VenueReceivablePayment" ADD CONSTRAINT "VenueReceivablePayment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "VenueReceivableInstallment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
