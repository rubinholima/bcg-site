-- AlterTable
ALTER TABLE "LegalDocument" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "EventPhoto" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventGalleryLink" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventGalleryLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventPhoto_eventId_idx" ON "EventPhoto"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventGalleryLink_token_key" ON "EventGalleryLink"("token");

-- CreateIndex
CREATE INDEX "EventGalleryLink_eventId_idx" ON "EventGalleryLink"("eventId");

-- CreateIndex
CREATE INDEX "EventGalleryLink_token_idx" ON "EventGalleryLink"("token");

-- AddForeignKey
ALTER TABLE "EventPhoto" ADD CONSTRAINT "EventPhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGalleryLink" ADD CONSTRAINT "EventGalleryLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
