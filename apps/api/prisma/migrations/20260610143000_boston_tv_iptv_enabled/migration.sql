-- Canais IPTV liberados para seleção nas telas

ALTER TABLE "BostonTvIptvChannel" ADD COLUMN "enabledForSelection" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "BostonTvIptvChannel_sourceId_enabledForSelection_idx" ON "BostonTvIptvChannel"("sourceId", "enabledForSelection");
