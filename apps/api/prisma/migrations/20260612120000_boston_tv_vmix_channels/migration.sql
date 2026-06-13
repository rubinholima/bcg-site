-- Fontes vMix (stream HLS/TS direto do vMix) para playlists Boston TV

CREATE TABLE "BostonTvVmixChannel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "streamUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BostonTvVmixChannel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BostonTvVmixChannel_tenantId_idx" ON "BostonTvVmixChannel"("tenantId");

ALTER TABLE "BostonTvVmixChannel" ADD CONSTRAINT "BostonTvVmixChannel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
