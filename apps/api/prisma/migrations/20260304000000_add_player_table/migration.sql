-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "birthDate" TEXT,
    "nationality" TEXT,
    "height" INTEGER,
    "weight" INTEGER,
    "preferredFoot" TEXT,
    "jerseyNumber" INTEGER,
    "position" TEXT,
    "fieldPositionX" DOUBLE PRECISION,
    "fieldPositionY" DOUBLE PRECISION,
    "currentTeam" TEXT,
    "previousTeams" JSONB,
    "seasonHistory" JSONB,
    "socialMedia" JSONB,
    "matchesPlayed" INTEGER,
    "goals" INTEGER,
    "assists" INTEGER,
    "yellowCards" INTEGER,
    "redCards" INTEGER,
    "marketValue" DOUBLE PRECISION,
    "highlights" JSONB,
    "bioPT" TEXT,
    "bioEN" TEXT,
    "externalId" TEXT,
    "medicalHistory" JSONB,
    "evaluations" JSONB,
    "status" TEXT DEFAULT 'available',
    "statusDetails" TEXT,
    "statusUntil" TIMESTAMP(3),
    "heatMapData" JSONB,
    "performanceAnalysis" TEXT,
    "images" JSONB,
    "publicFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Player_tenantId_idx" ON "Player"("tenantId");

-- CreateIndex
CREATE INDEX "Player_tenantId_category_idx" ON "Player"("tenantId", "category");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
