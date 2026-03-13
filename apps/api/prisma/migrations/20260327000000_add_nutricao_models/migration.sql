-- CreateTable
CREATE TABLE "NutritionCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "dailyCaloriesTarget" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionMealType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionMealType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionMenu" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "dayContext" TEXT,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionMenuItem" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "mealTypeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "calories" INTEGER,
    "proteinG" DOUBLE PRECISION,
    "carbsG" DOUBLE PRECISION,
    "fatsG" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionCalendarEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "menuId" TEXT NOT NULL,
    "dayContext" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionCalendarEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionAssessment" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplementGuide" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "whenToTake" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplementGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NutritionCategory_tenantId_idx" ON "NutritionCategory"("tenantId");

-- CreateIndex
CREATE INDEX "NutritionMealType_tenantId_idx" ON "NutritionMealType"("tenantId");

-- CreateIndex
CREATE INDEX "NutritionMenu_tenantId_idx" ON "NutritionMenu"("tenantId");
CREATE INDEX "NutritionMenu_categoryId_idx" ON "NutritionMenu"("categoryId");

-- CreateIndex
CREATE INDEX "NutritionMenuItem_menuId_idx" ON "NutritionMenuItem"("menuId");
CREATE INDEX "NutritionMenuItem_mealTypeId_idx" ON "NutritionMenuItem"("mealTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionCalendarEntry_tenantId_categoryId_date_key" ON "NutritionCalendarEntry"("tenantId", "categoryId", "date");
CREATE INDEX "NutritionCalendarEntry_tenantId_idx" ON "NutritionCalendarEntry"("tenantId");
CREATE INDEX "NutritionCalendarEntry_categoryId_idx" ON "NutritionCalendarEntry"("categoryId");
CREATE INDEX "NutritionCalendarEntry_date_idx" ON "NutritionCalendarEntry"("date");

-- CreateIndex
CREATE INDEX "NutritionAssessment_playerId_idx" ON "NutritionAssessment"("playerId");
CREATE INDEX "NutritionAssessment_assessedAt_idx" ON "NutritionAssessment"("assessedAt");

-- CreateIndex
CREATE INDEX "SupplementGuide_tenantId_idx" ON "SupplementGuide"("tenantId");
CREATE INDEX "SupplementGuide_categoryId_idx" ON "SupplementGuide"("categoryId");

-- AddForeignKey
ALTER TABLE "NutritionCategory" ADD CONSTRAINT "NutritionCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionMealType" ADD CONSTRAINT "NutritionMealType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionMenu" ADD CONSTRAINT "NutritionMenu_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NutritionMenu" ADD CONSTRAINT "NutritionMenu_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "NutritionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionMenuItem" ADD CONSTRAINT "NutritionMenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "NutritionMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NutritionMenuItem" ADD CONSTRAINT "NutritionMenuItem_mealTypeId_fkey" FOREIGN KEY ("mealTypeId") REFERENCES "NutritionMealType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionCalendarEntry" ADD CONSTRAINT "NutritionCalendarEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NutritionCalendarEntry" ADD CONSTRAINT "NutritionCalendarEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "NutritionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NutritionCalendarEntry" ADD CONSTRAINT "NutritionCalendarEntry_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "NutritionMenu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionAssessment" ADD CONSTRAINT "NutritionAssessment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementGuide" ADD CONSTRAINT "SupplementGuide_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplementGuide" ADD CONSTRAINT "SupplementGuide_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "NutritionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
