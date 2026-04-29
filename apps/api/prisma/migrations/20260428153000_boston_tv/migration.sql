-- Boston TV: playlists, itens e telas (player web)

CREATE TABLE "BostonTvPlaylist" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BostonTvPlaylist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BostonTvPlaylistItem" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "contentType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BostonTvPlaylistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BostonTvScreen" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationHint" TEXT,
    "playerToken" TEXT NOT NULL,
    "playlistId" TEXT,
    "scheduleTimezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "weeklySchedule" JSONB,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BostonTvScreen_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BostonTvScreen_playerToken_key" ON "BostonTvScreen"("playerToken");

CREATE INDEX "BostonTvPlaylist_tenantId_idx" ON "BostonTvPlaylist"("tenantId");
CREATE INDEX "BostonTvPlaylistItem_playlistId_idx" ON "BostonTvPlaylistItem"("playlistId");
CREATE INDEX "BostonTvScreen_tenantId_idx" ON "BostonTvScreen"("tenantId");

ALTER TABLE "BostonTvPlaylist" ADD CONSTRAINT "BostonTvPlaylist_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BostonTvPlaylistItem" ADD CONSTRAINT "BostonTvPlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "BostonTvPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BostonTvScreen" ADD CONSTRAINT "BostonTvScreen_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BostonTvScreen" ADD CONSTRAINT "BostonTvScreen_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "BostonTvPlaylist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
