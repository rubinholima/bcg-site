-- Modo de sync por tela: follow_hall (padrão) ou independent
ALTER TABLE "BostonTvScreen" ADD COLUMN "hallSyncMode" TEXT NOT NULL DEFAULT 'follow_hall';
