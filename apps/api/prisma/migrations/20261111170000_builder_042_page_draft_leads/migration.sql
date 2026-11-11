-- Builder 2.0 — rascunho/publicação, revisões e leads públicos (aditivo)

ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "draftContent" JSONB;
ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "hasUnpublishedDraft" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "PageContentRevision" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "label" TEXT,
    CONSTRAINT "PageContentRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PageContentRevision_pageId_createdAt_idx" ON "PageContentRevision"("pageId", "createdAt");

ALTER TABLE "PageContentRevision" DROP CONSTRAINT IF EXISTS "PageContentRevision_pageId_fkey";
ALTER TABLE "PageContentRevision" ADD CONSTRAINT "PageContentRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "PublicSiteLead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "blockId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'formulario_captura',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicSiteLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PublicSiteLead_tenantId_createdAt_idx" ON "PublicSiteLead"("tenantId", "createdAt");

ALTER TABLE "PublicSiteLead" DROP CONSTRAINT IF EXISTS "PublicSiteLead_tenantId_fkey";
ALTER TABLE "PublicSiteLead" ADD CONSTRAINT "PublicSiteLead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
