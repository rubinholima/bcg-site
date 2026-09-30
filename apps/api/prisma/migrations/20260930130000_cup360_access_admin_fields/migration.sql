ALTER TABLE "JobRole" ADD COLUMN IF NOT EXISTS "platformFamily" TEXT;
ALTER TABLE "JobRole" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "JobRole" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "Cup360AccessAudit" (
  "id" TEXT NOT NULL,
  "actorSub" TEXT NOT NULL,
  "actorEmail" TEXT,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "targetLabel" TEXT,
  "moduleSlug" TEXT,
  "changeType" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Cup360AccessAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Cup360AccessAudit_createdAt_idx" ON "Cup360AccessAudit"("createdAt");
CREATE INDEX IF NOT EXISTS "Cup360AccessAudit_targetType_targetId_idx" ON "Cup360AccessAudit"("targetType", "targetId");
