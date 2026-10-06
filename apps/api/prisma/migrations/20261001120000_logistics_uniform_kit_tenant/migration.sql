-- Kits de uniforme: propriedade por tenant + categoria opcional (legado permanece tenantId NULL)
ALTER TABLE "LogisticsUniformKit" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "LogisticsUniformKit" ADD COLUMN "teamCategory" TEXT;

CREATE INDEX "LogisticsUniformKit_tenantId_idx" ON "LogisticsUniformKit"("tenantId");
CREATE INDEX "LogisticsUniformKit_tenantId_active_idx" ON "LogisticsUniformKit"("tenantId", "active");

ALTER TABLE "LogisticsUniformKit" ADD CONSTRAINT "LogisticsUniformKit_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
