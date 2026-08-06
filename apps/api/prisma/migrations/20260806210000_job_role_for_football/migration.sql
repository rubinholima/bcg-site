-- AlterTable
ALTER TABLE "JobRole" ADD COLUMN "forFootball" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "JobRole_forFootball_idx" ON "JobRole"("forFootball");

-- Marca cargos já usados pela comissão técnica
UPDATE "JobRole" AS jr
SET "forFootball" = true
WHERE EXISTS (
  SELECT 1 FROM "TechnicalStaff" ts WHERE ts."jobRoleId" = jr."id"
);

-- Marca nomes típicos de funções de futebol (legado)
UPDATE "JobRole"
SET "forFootball" = true
WHERE "type" = 'staff'
  AND (
    UPPER("name") LIKE '%TECNICO%'
    OR UPPER("name") LIKE '%TÉCNICO%'
    OR UPPER("name") LIKE '%GOLEIRO%'
    OR UPPER("name") LIKE '%PREPARADOR%'
    OR UPPER("name") LIKE '%FISIOTERAPEUTA%'
    OR UPPER("name") LIKE '%FISIOLOGISTA%'
    OR UPPER("name") LIKE '%PSICOLOGO%'
    OR UPPER("name") LIKE '%PSICÓLOGO%'
    OR UPPER("name") LIKE '%NUTRICIONISTA%'
    OR UPPER("name") LIKE '%DESEMPENHO%'
    OR UPPER("name") LIKE '%SCOUT%'
    OR UPPER("name") LIKE '%MASSAGISTA%'
    OR UPPER("name") LIKE '%ENFERMEIRO%'
    OR UPPER("name") LIKE '%MEDICO%'
    OR UPPER("name") LIKE '%MÉDICO%'
    OR UPPER("name") LIKE '%AUXILIAR%'
    OR UPPER("name") LIKE '%COMISSAO%'
    OR UPPER("name") LIKE '%COMISSÃO%'
  );
