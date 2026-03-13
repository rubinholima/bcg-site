-- Marketing: postagens para calendário de conteúdo (inspirado no Meta Business Suite)

CREATE TABLE IF NOT EXISTS "MarketingPost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "imageUrls" JSONB,
    "platforms" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "externalIds" JSONB,
    "publishedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingPost_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MarketingPost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MarketingPost_tenantId_idx" ON "MarketingPost"("tenantId");
CREATE INDEX IF NOT EXISTS "MarketingPost_scheduledAt_idx" ON "MarketingPost"("scheduledAt");
CREATE INDEX IF NOT EXISTS "MarketingPost_status_idx" ON "MarketingPost"("status");
