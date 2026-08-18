-- Perfis pedagoga/assistente na matriz + acesso Assistência Social + SIMADE

ALTER TABLE "PlayerSchoolEnrollment" ADD COLUMN IF NOT EXISTS "simadeNumber" TEXT;

-- Perfis (Cup360 / operação)
INSERT INTO "PlatformRole" ("id", "slug", "label", "sortOrder", "canAccessDashboard", "includeInMatrix", "isSystem", "isActive", "updatedAt")
SELECT 'prole_assistente', 'assistente', 'ASSISTENTE SOCIAL', 260, true, true, false, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PlatformRole" WHERE "slug" = 'assistente');

INSERT INTO "PlatformRole" ("id", "slug", "label", "sortOrder", "canAccessDashboard", "includeInMatrix", "isSystem", "isActive", "updatedAt")
SELECT 'prole_pedagoga', 'pedagoga', 'PEDAGOGA', 265, true, true, false, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PlatformRole" WHERE "slug" = 'pedagoga');

UPDATE "PlatformRole"
SET "canAccessDashboard" = true, "includeInMatrix" = true, "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN ('assistente', 'pedagoga');

-- ModuleRole faltante (módulo × perfil)
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-asst-' || m."id", m."id", 'assistente', false
FROM "Module" m
WHERE NOT EXISTS (
  SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'assistente'
);

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-ped-' || m."id", m."id", 'pedagoga', false
FROM "Module" m
WHERE NOT EXISTS (
  SELECT 1 FROM "ModuleRole" mr WHERE mr."moduleId" = m."id" AND mr."role" = 'pedagoga'
);

-- Acesso padrão: Assistência Social / Pedagogia + cadastro de atletas
UPDATE "ModuleRole" mr
SET "canAccess" = true
FROM "Module" m
WHERE mr."moduleId" = m."id"
  AND mr."role" IN ('assistente', 'pedagoga')
  AND (
    m."slug" = 'futebol_assistencia_social'
    OR m."slug" LIKE 'assistencia_social%'
    OR m."slug" = 'player_tab__assistencia_social'
    OR m."slug" = 'dashboard__dashboard'
    OR m."slug" = 'dashboard'
    OR m."slug" = 'futebol/futebol_cadastros__cad_jogadores'
  );
