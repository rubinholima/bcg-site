-- AlterTable
ALTER TABLE "PublicDomain" ADD COLUMN IF NOT EXISTS "provisioningStep" TEXT;
ALTER TABLE "PublicDomain" ADD COLUMN IF NOT EXISTS "provisioningMetadata" JSONB;
