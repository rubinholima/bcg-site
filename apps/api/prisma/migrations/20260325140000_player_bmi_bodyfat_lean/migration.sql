-- Composição corporal alinhada entre cadastro, fisiologia e nutrição
ALTER TABLE "Player" ADD COLUMN "bmi" DOUBLE PRECISION;
ALTER TABLE "Player" ADD COLUMN "bodyFatPercent" DOUBLE PRECISION;
ALTER TABLE "Player" ADD COLUMN "leanMassKg" DOUBLE PRECISION;
ALTER TABLE "Player" ADD COLUMN "bmiManualAt" TIMESTAMP(3);
ALTER TABLE "Player" ADD COLUMN "bodyFatPercentManualAt" TIMESTAMP(3);
ALTER TABLE "Player" ADD COLUMN "leanMassManualAt" TIMESTAMP(3);
