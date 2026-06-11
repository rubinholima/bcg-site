-- Canal Hall sincronizado (relógio mestre por tenant/playlist)
CREATE TABLE "BostonTvHallChannel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "epochAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "pausedElapsedMs" INTEGER NOT NULL DEFAULT 0,
    "playlistVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BostonTvHallChannel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BostonTvHallChannel_tenantId_key" ON "BostonTvHallChannel"("tenantId");
CREATE UNIQUE INDEX "BostonTvHallChannel_playlistId_key" ON "BostonTvHallChannel"("playlistId");
CREATE INDEX "BostonTvHallChannel_playlistId_idx" ON "BostonTvHallChannel"("playlistId");

ALTER TABLE "BostonTvHallChannel" ADD CONSTRAINT "BostonTvHallChannel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BostonTvHallChannel" ADD CONSTRAINT "BostonTvHallChannel_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "BostonTvPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
