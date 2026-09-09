-- CreateTable
CREATE TABLE "UserPresenceSession" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "tenantId" TEXT,
    "tenantLabel" TEXT,
    "currentPath" TEXT,
    "currentModule" TEXT,
    "currentPageTitle" TEXT,
    "userAgent" TEXT,
    "browserLabel" TEXT,
    "deviceLabel" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPresenceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAnnouncement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "targetMode" TEXT NOT NULL DEFAULT 'all',
    "targetUserId" TEXT,
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAnnouncementReceipt" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "PlatformAnnouncementReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPresenceSession_sessionKey_key" ON "UserPresenceSession"("sessionKey");

-- CreateIndex
CREATE INDEX "UserPresenceSession_userId_idx" ON "UserPresenceSession"("userId");

-- CreateIndex
CREATE INDEX "UserPresenceSession_lastSeenAt_idx" ON "UserPresenceSession"("lastSeenAt");

-- CreateIndex
CREATE INDEX "UserPresenceSession_lastActivityAt_idx" ON "UserPresenceSession"("lastActivityAt");

-- CreateIndex
CREATE INDEX "PlatformAnnouncement_targetMode_startsAt_expiresAt_idx" ON "PlatformAnnouncement"("targetMode", "startsAt", "expiresAt");

-- CreateIndex
CREATE INDEX "PlatformAnnouncement_createdAt_idx" ON "PlatformAnnouncement"("createdAt");

-- CreateIndex
CREATE INDEX "PlatformAnnouncementReceipt_userId_idx" ON "PlatformAnnouncementReceipt"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAnnouncementReceipt_announcementId_userId_key" ON "PlatformAnnouncementReceipt"("announcementId", "userId");

-- AddForeignKey
ALTER TABLE "UserPresenceSession" ADD CONSTRAINT "UserPresenceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPresenceSession" ADD CONSTRAINT "UserPresenceSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAnnouncement" ADD CONSTRAINT "PlatformAnnouncement_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAnnouncement" ADD CONSTRAINT "PlatformAnnouncement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAnnouncementReceipt" ADD CONSTRAINT "PlatformAnnouncementReceipt_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "PlatformAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAnnouncementReceipt" ADD CONSTRAINT "PlatformAnnouncementReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
