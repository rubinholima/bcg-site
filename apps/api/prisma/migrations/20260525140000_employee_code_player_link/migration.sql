-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "code" TEXT;
ALTER TABLE "Employee" ADD COLUMN "playerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_playerId_key" ON "Employee"("playerId");
CREATE UNIQUE INDEX "Employee_tenantId_code_key" ON "Employee"("tenantId", "code");
CREATE INDEX "Employee_playerId_idx" ON "Employee"("playerId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill matrícula para colaboradores existentes
UPDATE "Employee" e
SET code = sub.code
FROM (
  SELECT id,
    CONCAT('COL-', LPAD(ROW_NUMBER() OVER (PARTITION BY "tenantId" ORDER BY "createdAt")::text, 6, '0')) AS code
  FROM "Employee"
  WHERE code IS NULL
) sub
WHERE e.id = sub.id AND e.code IS NULL;
