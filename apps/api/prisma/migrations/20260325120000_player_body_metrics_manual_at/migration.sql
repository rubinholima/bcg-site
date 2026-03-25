-- Controle de edição manual de peso/altura no cadastro vs. medições datadas (fisiologia/nutrição)
ALTER TABLE "Player" ADD COLUMN "weightManualAt" TIMESTAMP(3);
ALTER TABLE "Player" ADD COLUMN "heightManualAt" TIMESTAMP(3);
