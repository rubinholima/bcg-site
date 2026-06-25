-- Material de apoio — psicologia (PDFs, imagens, documentos)
CREATE TABLE IF NOT EXISTS "PsychologySupportMaterial" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "fileKey" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "fileSizeBytes" INTEGER,
  "tenantId" TEXT,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PsychologySupportMaterial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PsychologySupportMaterial_tenantId_idx" ON "PsychologySupportMaterial"("tenantId");
CREATE INDEX IF NOT EXISTS "PsychologySupportMaterial_createdAt_idx" ON "PsychologySupportMaterial"("createdAt");

ALTER TABLE "PsychologySupportMaterial" DROP CONSTRAINT IF EXISTS "PsychologySupportMaterial_tenantId_fkey";
ALTER TABLE "PsychologySupportMaterial" ADD CONSTRAINT "PsychologySupportMaterial_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
