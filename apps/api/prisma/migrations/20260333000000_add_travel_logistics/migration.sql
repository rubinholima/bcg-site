-- CreateTable
CREATE TABLE "TravelLogistics" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "opponentName" TEXT,
    "stadiumName" TEXT,
    "city" TEXT,
    "country" TEXT,
    "championshipName" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "transportType" TEXT,
    "transportDetails" TEXT,
    "estimatedDeparture" TIMESTAMP(3),
    "estimatedArrival" TIMESTAMP(3),
    "hotelName" TEXT,
    "hotelAddress" TEXT,
    "accommodationRooms" JSONB,
    "mealPlan" JSONB,
    "nutritionApprovedAt" TIMESTAMP(3),
    "nutritionApprovedBy" TEXT,
    "estimatedCostTotal" DOUBLE PRECISION,
    "estimatedCostBreakdown" JSONB,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "weatherForecast" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelLogistics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TravelLogistics_tenantId_idx" ON "TravelLogistics"("tenantId");

-- CreateIndex
CREATE INDEX "TravelLogistics_tenantId_matchDate_idx" ON "TravelLogistics"("tenantId", "matchDate");

-- CreateIndex
CREATE INDEX "TravelLogistics_status_idx" ON "TravelLogistics"("status");

-- AddForeignKey
ALTER TABLE "TravelLogistics" ADD CONSTRAINT "TravelLogistics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Module futebol_logistica
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-futebol-logistica', 'futebol_logistica', 'Logística', 32
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_logistica');

-- ModuleRole para futebol_logistica
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-flog-sa', 'mod-futebol-logistica', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-logistica' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-flog-ca', 'mod-futebol-logistica', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-logistica' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-flog-ed', 'mod-futebol-logistica', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-logistica' AND "role" = 'editor');
