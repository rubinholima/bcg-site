-- Funções operacionais BCH + campos de compensação em escalas

CREATE TABLE "BchOperationalRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchOperationalRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BchOperationalRole_tenantId_code_key" ON "BchOperationalRole"("tenantId", "code");
CREATE INDEX "BchOperationalRole_tenantId_active_idx" ON "BchOperationalRole"("tenantId", "active");

ALTER TABLE "BchOperationalRole" ADD CONSTRAINT "BchOperationalRole_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BchEventTeamMember" ADD COLUMN "operationalRoleId" TEXT;
ALTER TABLE "BchEventStaffAssignment" ADD COLUMN "operationalRoleId" TEXT;
ALTER TABLE "BchEventStaffAssignment" ADD COLUMN "plannedQuantity" DECIMAL(14,4);
ALTER TABLE "BchEventStaffAssignment" ADD COLUMN "actualQuantity" DECIMAL(14,4);
ALTER TABLE "BchEventStaffAssignment" ADD COLUMN "paymentStatus" TEXT;

CREATE INDEX "BchEventTeamMember_operationalRoleId_idx" ON "BchEventTeamMember"("operationalRoleId");
CREATE INDEX "BchEventStaffAssignment_operationalRoleId_idx" ON "BchEventStaffAssignment"("operationalRoleId");

ALTER TABLE "BchEventTeamMember" ADD CONSTRAINT "BchEventTeamMember_operationalRoleId_fkey"
  FOREIGN KEY ("operationalRoleId") REFERENCES "BchOperationalRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BchEventStaffAssignment" ADD CONSTRAINT "BchEventStaffAssignment_operationalRoleId_fkey"
  FOREIGN KEY ("operationalRoleId") REFERENCES "BchOperationalRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
