-- CreateTable
CREATE TABLE "NutritionAnamnesis" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionAnamnesis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NutritionAnamnesis_playerId_idx" ON "NutritionAnamnesis"("playerId");

-- CreateIndex
CREATE INDEX "NutritionAnamnesis_assessedAt_idx" ON "NutritionAnamnesis"("assessedAt");

-- AddForeignKey
ALTER TABLE "NutritionAnamnesis" ADD CONSTRAINT "NutritionAnamnesis_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
