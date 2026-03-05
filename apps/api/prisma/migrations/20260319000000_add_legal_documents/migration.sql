-- Tabela de documentos jurídicos por jogador
CREATE TABLE "LegalDocument" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "fileKey" TEXT NOT NULL,
  "fileUrl" TEXT,
  "signedFileKey" TEXT,
  "signedFileUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "adobeAgreementId" TEXT,
  "signerEmail" TEXT,
  "signerName" TEXT,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LegalDocument_playerId_idx" ON "LegalDocument"("playerId");
CREATE INDEX "LegalDocument_status_idx" ON "LegalDocument"("status");
CREATE INDEX "LegalDocument_adobeAgreementId_idx" ON "LegalDocument"("adobeAgreementId");

ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Módulo jurídico
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-juridico', 'juridico', 'Controle Jurídico', 5.7
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'juridico');

-- Permissões: super_admin e company_admin sempre; diretoria também
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-jur-sa', 'mod-juridico', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-juridico' AND "role" = 'super_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-jur-ca', 'mod-juridico', 'company_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-juridico' AND "role" = 'company_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-jur-dir', 'mod-juridico', 'diretoria', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-juridico' AND "role" = 'diretoria');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-jur-ed', 'mod-juridico', 'editor', false
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-juridico' AND "role" = 'editor');
