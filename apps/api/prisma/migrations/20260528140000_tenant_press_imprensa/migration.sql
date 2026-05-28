-- Imprensa do clube: fotos, links de galeria e tokens de upload (espelha eventos)

CREATE TABLE "TenantPressPhoto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "caption" TEXT,
    "matchLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantPressPhoto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantPressGalleryLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantPressGalleryLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantPressUploadToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantPressUploadToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantPressGalleryLink_token_key" ON "TenantPressGalleryLink"("token");
CREATE INDEX "TenantPressGalleryLink_tenantId_idx" ON "TenantPressGalleryLink"("tenantId");
CREATE INDEX "TenantPressGalleryLink_token_idx" ON "TenantPressGalleryLink"("token");

CREATE UNIQUE INDEX "TenantPressUploadToken_token_key" ON "TenantPressUploadToken"("token");
CREATE INDEX "TenantPressUploadToken_tenantId_idx" ON "TenantPressUploadToken"("tenantId");
CREATE INDEX "TenantPressUploadToken_token_idx" ON "TenantPressUploadToken"("token");

CREATE INDEX "TenantPressPhoto_tenantId_idx" ON "TenantPressPhoto"("tenantId");

ALTER TABLE "TenantPressPhoto" ADD CONSTRAINT "TenantPressPhoto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantPressGalleryLink" ADD CONSTRAINT "TenantPressGalleryLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantPressUploadToken" ADD CONSTRAINT "TenantPressUploadToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
