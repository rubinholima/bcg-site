-- Boston TV IPTV: fonte M3U, canais importados, tela em modo canal fixo

CREATE TABLE "BostonTvIptvSource" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'IPTV',
    "playlistUrl" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "channelCount" INTEGER NOT NULL DEFAULT 0,
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BostonTvIptvSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BostonTvIptvChannel" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupTitle" TEXT,
    "logoUrl" TEXT,
    "streamUrl" TEXT NOT NULL,
    "streamUrlHash" TEXT NOT NULL,
    "tvgId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BostonTvIptvChannel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BostonTvIptvSource_tenantId_idx" ON "BostonTvIptvSource"("tenantId");
CREATE INDEX "BostonTvIptvChannel_sourceId_idx" ON "BostonTvIptvChannel"("sourceId");
CREATE INDEX "BostonTvIptvChannel_sourceId_name_idx" ON "BostonTvIptvChannel"("sourceId", "name");
CREATE UNIQUE INDEX "BostonTvIptvChannel_sourceId_streamUrlHash_key" ON "BostonTvIptvChannel"("sourceId", "streamUrlHash");

ALTER TABLE "BostonTvIptvSource" ADD CONSTRAINT "BostonTvIptvSource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BostonTvIptvChannel" ADD CONSTRAINT "BostonTvIptvChannel_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "BostonTvIptvSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BostonTvScreen" ADD COLUMN "displayMode" TEXT NOT NULL DEFAULT 'playlist';
ALTER TABLE "BostonTvScreen" ADD COLUMN "iptvChannelId" TEXT;

ALTER TABLE "BostonTvScreen" ADD CONSTRAINT "BostonTvScreen_iptvChannelId_fkey" FOREIGN KEY ("iptvChannelId") REFERENCES "BostonTvIptvChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "BostonTvScreen_iptvChannelId_idx" ON "BostonTvScreen"("iptvChannelId");
