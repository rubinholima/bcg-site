-- CUP360: função plataforma + defaults + overrides (navegação independente de autorização)

ALTER TABLE "JobRole" ALTER COLUMN "tenantId" DROP NOT NULL;

ALTER TABLE "JobRole" ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE "JobRole" ADD COLUMN IF NOT EXISTS "platformLegacyRole" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "JobRole_platformLegacyRole_key" ON "JobRole"("platformLegacyRole");

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "platformFunctionId" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_platformFunctionId_fkey"
  FOREIGN KEY ("platformFunctionId") REFERENCES "JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "User_platformFunctionId_idx" ON "User"("platformFunctionId");

CREATE TABLE IF NOT EXISTS "JobRoleModuleDefault" (
  "id" TEXT NOT NULL,
  "jobRoleId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  CONSTRAINT "JobRoleModuleDefault_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobRoleModuleDefault_jobRoleId_moduleId_key"
  ON "JobRoleModuleDefault"("jobRoleId", "moduleId");
CREATE INDEX IF NOT EXISTS "JobRoleModuleDefault_jobRoleId_idx" ON "JobRoleModuleDefault"("jobRoleId");
CREATE INDEX IF NOT EXISTS "JobRoleModuleDefault_moduleId_idx" ON "JobRoleModuleDefault"("moduleId");

ALTER TABLE "JobRoleModuleDefault" ADD CONSTRAINT "JobRoleModuleDefault_jobRoleId_fkey"
  FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobRoleModuleDefault" ADD CONSTRAINT "JobRoleModuleDefault_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "UserModuleOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "effect" TEXT NOT NULL,
  CONSTRAINT "UserModuleOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserModuleOverride_userId_moduleId_key"
  ON "UserModuleOverride"("userId", "moduleId");
CREATE INDEX IF NOT EXISTS "UserModuleOverride_userId_idx" ON "UserModuleOverride"("userId");
CREATE INDEX IF NOT EXISTS "UserModuleOverride_moduleId_idx" ON "UserModuleOverride"("moduleId");

ALTER TABLE "UserModuleOverride" ADD CONSTRAINT "UserModuleOverride_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserModuleOverride" ADD CONSTRAINT "UserModuleOverride_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Funções plataforma a partir de PlatformRole (matriz legada)
INSERT INTO "JobRole" ("id", "tenantId", "departmentId", "name", "code", "type", "scope", "platformLegacyRole", "forFootball", "createdAt", "updatedAt")
SELECT
  'pf_' || pr."slug",
  NULL,
  NULL,
  pr."label",
  UPPER(pr."slug"),
  'staff',
  'platform',
  CASE WHEN pr."slug" = 'gestor' THEN 'gerente' ELSE pr."slug" END,
  false,
  NOW(),
  NOW()
FROM "PlatformRole" pr
WHERE pr."includeInMatrix" = true
  AND pr."slug" NOT IN ('super_admin')
ON CONFLICT ("id") DO NOTHING;

-- Segunda função platform para role User.role = gestor (legado)
INSERT INTO "JobRole" ("id", "tenantId", "departmentId", "name", "code", "type", "scope", "platformLegacyRole", "forFootball", "createdAt", "updatedAt")
VALUES (
  'pf_gestor_legacy',
  NULL,
  NULL,
  'Gestor (legado)',
  'GESTOR',
  'staff',
  'platform',
  'gestor',
  false,
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

-- Defaults: copiar ModuleRole → JobRoleModuleDefault (role matriz = platformLegacyRole)
INSERT INTO "JobRoleModuleDefault" ("id", "jobRoleId", "moduleId")
SELECT
  'jrd_' || md5(jr."id" || mr."moduleId"),
  jr."id",
  mr."moduleId"
FROM "ModuleRole" mr
JOIN "JobRole" jr ON jr."scope" = 'platform' AND jr."platformLegacyRole" = mr."role"
WHERE mr."canAccess" = true
ON CONFLICT ("id") DO NOTHING;

-- Vincular usuários à função plataforma pelo role
UPDATE "User" u
SET "platformFunctionId" = jr."id"
FROM "JobRole" jr
WHERE jr."scope" = 'platform'
  AND jr."platformLegacyRole" = CASE
    WHEN LOWER(TRIM(COALESCE(u."role", ''))) = 'gestor' THEN 'gerente'
    ELSE LOWER(TRIM(COALESCE(u."role", 'editor')))
  END
  AND u."role" IS DISTINCT FROM 'super_admin'
  AND u."platformFunctionId" IS NULL;
