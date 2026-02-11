-- CreateTable
CREATE TABLE "Championship" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Championship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stadium" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stadium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitingTeam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitingTeam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Championship_name_key" ON "Championship"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Stadium_name_key" ON "Stadium"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VisitingTeam_name_key" ON "VisitingTeam"("name");
