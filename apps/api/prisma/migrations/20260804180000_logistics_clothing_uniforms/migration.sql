-- Vestuário/uniformes (Beatscode): grupos, categorias, tipos de uniforme, peças e kits

CREATE TABLE "LogisticsClothingGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beatscodeId" INTEGER,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsClothingGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsClothingCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "beatscodeId" INTEGER,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsClothingCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsUniformType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beatscodeId" INTEGER,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsUniformType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsClothingItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "groupId" TEXT,
    "uniformTypeId" TEXT,
    "season" TEXT,
    "imageUrl" TEXT,
    "beatscodeId" INTEGER,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsClothingItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsUniformKit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uniformTypeId" TEXT,
    "season" TEXT,
    "imageUrl" TEXT,
    "beatscodeId" INTEGER,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsUniformKit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsUniformKitItem" (
    "kitId" TEXT NOT NULL,
    "clothingItemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogisticsUniformKitItem_pkey" PRIMARY KEY ("kitId","clothingItemId")
);

CREATE UNIQUE INDEX "LogisticsClothingGroup_name_key" ON "LogisticsClothingGroup"("name");
CREATE UNIQUE INDEX "LogisticsClothingGroup_beatscodeId_key" ON "LogisticsClothingGroup"("beatscodeId");

CREATE UNIQUE INDEX "LogisticsClothingCategory_beatscodeId_key" ON "LogisticsClothingCategory"("beatscodeId");
CREATE UNIQUE INDEX "LogisticsClothingCategory_groupId_name_key" ON "LogisticsClothingCategory"("groupId", "name");
CREATE INDEX "LogisticsClothingCategory_groupId_idx" ON "LogisticsClothingCategory"("groupId");

CREATE UNIQUE INDEX "LogisticsUniformType_name_key" ON "LogisticsUniformType"("name");
CREATE UNIQUE INDEX "LogisticsUniformType_beatscodeId_key" ON "LogisticsUniformType"("beatscodeId");

CREATE UNIQUE INDEX "LogisticsClothingItem_beatscodeId_key" ON "LogisticsClothingItem"("beatscodeId");
CREATE INDEX "LogisticsClothingItem_categoryId_idx" ON "LogisticsClothingItem"("categoryId");
CREATE INDEX "LogisticsClothingItem_groupId_idx" ON "LogisticsClothingItem"("groupId");
CREATE INDEX "LogisticsClothingItem_uniformTypeId_idx" ON "LogisticsClothingItem"("uniformTypeId");

CREATE UNIQUE INDEX "LogisticsUniformKit_beatscodeId_key" ON "LogisticsUniformKit"("beatscodeId");
CREATE INDEX "LogisticsUniformKit_uniformTypeId_idx" ON "LogisticsUniformKit"("uniformTypeId");

CREATE INDEX "LogisticsUniformKitItem_clothingItemId_idx" ON "LogisticsUniformKitItem"("clothingItemId");

ALTER TABLE "LogisticsClothingCategory" ADD CONSTRAINT "LogisticsClothingCategory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LogisticsClothingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LogisticsClothingItem" ADD CONSTRAINT "LogisticsClothingItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LogisticsClothingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LogisticsClothingItem" ADD CONSTRAINT "LogisticsClothingItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LogisticsClothingGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LogisticsClothingItem" ADD CONSTRAINT "LogisticsClothingItem_uniformTypeId_fkey" FOREIGN KEY ("uniformTypeId") REFERENCES "LogisticsUniformType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LogisticsUniformKit" ADD CONSTRAINT "LogisticsUniformKit_uniformTypeId_fkey" FOREIGN KEY ("uniformTypeId") REFERENCES "LogisticsUniformType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LogisticsUniformKitItem" ADD CONSTRAINT "LogisticsUniformKitItem_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "LogisticsUniformKit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LogisticsUniformKitItem" ADD CONSTRAINT "LogisticsUniformKitItem_clothingItemId_fkey" FOREIGN KEY ("clothingItemId") REFERENCES "LogisticsClothingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
