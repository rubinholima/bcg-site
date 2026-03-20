-- CreateTable
CREATE TABLE "EventUploadToken" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventUploadToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventUploadToken_token_key" ON "EventUploadToken"("token");

-- CreateIndex
CREATE INDEX "EventUploadToken_eventId_idx" ON "EventUploadToken"("eventId");

-- CreateIndex
CREATE INDEX "EventUploadToken_token_idx" ON "EventUploadToken"("token");

-- AddForeignKey
ALTER TABLE "EventUploadToken" ADD CONSTRAINT "EventUploadToken_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
