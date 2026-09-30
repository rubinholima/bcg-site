-- Função plataforma para User.role = user (acesso só via matriz personalizada / overrides).
INSERT INTO "JobRole" (
  "id",
  "tenantId",
  "departmentId",
  "name",
  "code",
  "type",
  "scope",
  "platformLegacyRole",
  "platformFamily",
  "description",
  "isActive",
  "forFootball",
  "createdAt",
  "updatedAt"
)
SELECT
  'cup360_fn_user_basic',
  NULL,
  NULL,
  'USUÁRIO BÁSICO',
  'USER_BASIC',
  'staff',
  'platform',
  'user',
  'sistema',
  'Perfil legado sem defaults de matriz — acesso via função atribuída e exceções.',
  true,
  false,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "JobRole" WHERE "scope" = 'platform' AND "platformLegacyRole" = 'user'
);
