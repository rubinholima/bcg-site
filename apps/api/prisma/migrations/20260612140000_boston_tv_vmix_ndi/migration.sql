-- Fontes vMix: stream HTTP ou NDI (nome da fonte na rede)

ALTER TABLE "BostonTvVmixChannel" ADD COLUMN "deliveryType" TEXT NOT NULL DEFAULT 'stream';
ALTER TABLE "BostonTvVmixChannel" ADD COLUMN "ndiSourceName" TEXT;
