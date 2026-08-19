-- Relatórios Saúde: módulo hub + acesso clínico (fisioterapia, enfermagem, etc.)

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea", "impliesSlug")
SELECT 'mod-relatorios-saude', 'relatorios_saude', 'Relatórios — Depto Saúde', 9990, 'saude', NULL
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'relatorios_saude');

-- ModuleRole faltante para todos os perfis da matriz
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-rs-' || pr."slug", m."id", pr."slug", false
FROM "Module" m
CROSS JOIN "PlatformRole" pr
WHERE m."slug" = 'relatorios_saude'
  AND pr."includeInMatrix" = true
  AND pr."isActive" = true
  AND NOT EXISTS (
    SELECT 1 FROM "ModuleRole" mr
    WHERE mr."moduleId" = m."id" AND mr."role" = pr."slug"
  );

-- Acesso padrão: equipe clínica de saúde
UPDATE "ModuleRole" mr
SET "canAccess" = true
FROM "Module" m
WHERE mr."moduleId" = m."id"
  AND m."slug" = 'relatorios_saude'
  AND mr."role" IN (
    'fisioterapia',
    'massagista',
    'estagiario',
    'estagiaria',
    'enfermeiro',
    'enfermeiro_tec',
    'coordenadora',
    'medico',
    'psicologo',
    'company_admin',
    'super_admin'
  );
