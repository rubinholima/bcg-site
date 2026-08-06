-- Cadastro único de estagiários (área do futebol / saúde)
CREATE TABLE "HealthIntern" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "photoUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "registry" TEXT,
    "bio" TEXT,
    "notes" TEXT,
    "supervisorId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthIntern_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HealthIntern_tenantId_idx" ON "HealthIntern"("tenantId");
CREATE INDEX "HealthIntern_area_idx" ON "HealthIntern"("area");
CREATE INDEX "HealthIntern_active_idx" ON "HealthIntern"("active");
CREATE INDEX "HealthIntern_name_idx" ON "HealthIntern"("name");
CREATE INDEX "HealthIntern_supervisorId_idx" ON "HealthIntern"("supervisorId");

ALTER TABLE "HealthIntern" ADD CONSTRAINT "HealthIntern_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HealthIntern" ADD CONSTRAINT "HealthIntern_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Psychologist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrar estagiários de psicologia (mesmo id → sessões continuam válidas)
INSERT INTO "HealthIntern" (
  "id", "tenantId", "name", "area", "photoUrl", "email", "phone", "registry", "bio", "notes",
  "supervisorId", "active", "createdAt", "updatedAt"
)
SELECT
  p."id",
  p."tenantId",
  p."name",
  'psicologia',
  p."photoUrl",
  p."email",
  p."phone",
  p."crpOrEquivalent",
  p."bio",
  NULL,
  CASE
    WHEN p."supervisorId" IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM "Psychologist" s
        WHERE s."id" = p."supervisorId" AND COALESCE(s."staffRole", 'psicologo') = 'psicologo'
      )
    THEN p."supervisorId"
    ELSE NULL
  END,
  true,
  p."createdAt",
  p."updatedAt"
FROM "Psychologist" p
WHERE p."staffRole" = 'estagiario';

-- Remover vínculos de supervisão entre registros que serão apagados
UPDATE "Psychologist" SET "supervisorId" = NULL
WHERE "supervisorId" IN (SELECT "id" FROM "Psychologist" WHERE "staffRole" = 'estagiario');

DELETE FROM "Psychologist" WHERE "staffRole" = 'estagiario';

-- Migrar estagiários do cadastro médico
INSERT INTO "HealthIntern" (
  "id", "tenantId", "name", "area", "photoUrl", "email", "phone", "registry", "bio", "notes",
  "supervisorId", "active", "createdAt", "updatedAt"
)
SELECT
  m."id",
  m."tenantId",
  m."name",
  CASE
    WHEN UPPER(COALESCE(m."specialty", '')) LIKE '%FISIOTE%' OR UPPER(COALESCE(m."specialty", '')) LIKE '%FISIO %' THEN 'fisioterapia'
    WHEN UPPER(COALESCE(m."specialty", '')) LIKE '%ENFERM%' THEN 'enfermagem'
    WHEN UPPER(COALESCE(m."specialty", '')) LIKE '%NUTRI%' THEN 'nutricao'
    WHEN UPPER(COALESCE(m."specialty", '')) LIKE '%FISIOLOG%' THEN 'fisiologia'
    WHEN UPPER(COALESCE(m."specialty", '')) LIKE '%MASSAG%' THEN 'massagem'
    WHEN UPPER(COALESCE(m."specialty", '')) LIKE '%PSICO%' THEN 'psicologia'
    ELSE 'medicina'
  END,
  m."photoUrl",
  m."email",
  m."phone",
  m."crmCoren",
  m."bio",
  m."notes",
  NULL,
  true,
  m."createdAt",
  m."updatedAt"
FROM "MedicalStaff" m
WHERE UPPER(m."role") = 'ESTAGIARIO';

DELETE FROM "MedicalStaff" WHERE UPPER("role") = 'ESTAGIARIO';
