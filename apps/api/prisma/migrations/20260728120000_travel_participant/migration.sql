-- CreateTable
CREATE TABLE "TravelParticipant" (
    "id" TEXT NOT NULL,
    "travelLogisticsId" TEXT NOT NULL,
    "personType" TEXT NOT NULL,
    "playerId" TEXT,
    "staffId" TEXT,
    "guestName" TEXT,
    "guestDocument" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TravelParticipant_travelLogisticsId_idx" ON "TravelParticipant"("travelLogisticsId");

-- CreateIndex
CREATE INDEX "TravelParticipant_playerId_idx" ON "TravelParticipant"("playerId");

-- CreateIndex
CREATE INDEX "TravelParticipant_staffId_idx" ON "TravelParticipant"("staffId");

-- CreateIndex
CREATE INDEX "TravelParticipant_travelLogisticsId_personType_idx" ON "TravelParticipant"("travelLogisticsId", "personType");

-- CreateIndex (evita duplicar o mesmo atleta na mesma viagem)
CREATE UNIQUE INDEX "TravelParticipant_travel_player_unique"
  ON "TravelParticipant"("travelLogisticsId", "playerId")
  WHERE "playerId" IS NOT NULL;

-- CreateIndex (evita duplicar o mesmo staff na mesma viagem)
CREATE UNIQUE INDEX "TravelParticipant_travel_staff_unique"
  ON "TravelParticipant"("travelLogisticsId", "staffId")
  WHERE "staffId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "TravelParticipant" ADD CONSTRAINT "TravelParticipant_travelLogisticsId_fkey" FOREIGN KEY ("travelLogisticsId") REFERENCES "TravelLogistics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelParticipant" ADD CONSTRAINT "TravelParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelParticipant" ADD CONSTRAINT "TravelParticipant_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "TechnicalStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
