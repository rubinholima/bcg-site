-- Credenciais Omie por empresa (Tenant), cifradas na aplicação
ALTER TABLE "Tenant" ADD COLUMN "omieAppKeyEnc" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "omieAppKeyIv" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "omieAppSecretEnc" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "omieAppSecretIv" TEXT;
