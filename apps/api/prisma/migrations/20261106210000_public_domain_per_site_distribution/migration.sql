-- AlterTable — CloudFront dedicado por site
ALTER TABLE "PublicDomain" ADD COLUMN IF NOT EXISTS "distributionDomain" TEXT;
ALTER TABLE "PublicDomain" ADD COLUMN IF NOT EXISTS "cloudFrontFunctionArn" TEXT;
