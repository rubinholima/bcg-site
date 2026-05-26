-- AlterTable
ALTER TABLE "RegistrationInvite" ADD COLUMN "reviewStatus" TEXT;
ALTER TABLE "RegistrationInvite" ADD COLUMN "submittedPayload" JSONB;
ALTER TABLE "RegistrationInvite" ADD COLUMN "submittedDocuments" JSONB;
ALTER TABLE "RegistrationInvite" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "RegistrationInvite" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "RegistrationInvite" ADD COLUMN "reviewedByUserId" TEXT;
ALTER TABLE "RegistrationInvite" ADD COLUMN "rejectionReason" TEXT;

-- CreateIndex
CREATE INDEX "RegistrationInvite_reviewStatus_idx" ON "RegistrationInvite"("reviewStatus");
