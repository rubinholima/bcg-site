-- Unifica módulos médico + psicologia num único módulo `saude` (matriz e API).

INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea")
SELECT 'mod-saude', 'saude', 'Saúde (equipe médica e psicológica)', 5,
  'saude_dados_sensiveis'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE slug = 'saude');

-- Permissões: para cada papel, há acesso se qualquer dos dois antigos módulos permitia.
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") VALUES
  ('mr-saude-sup', 'mod-saude', 'super_admin', COALESCE((SELECT BOOL_OR(MR."canAccess") FROM "ModuleRole" MR JOIN "Module" MM ON MR."moduleId" = MM.id WHERE MM.slug IN ('medico', 'psicologia') AND MR.role = 'super_admin'), false)),
  ('mr-saude-ca', 'mod-saude', 'company_admin', COALESCE((SELECT BOOL_OR(MR."canAccess") FROM "ModuleRole" MR JOIN "Module" MM ON MR."moduleId" = MM.id WHERE MM.slug IN ('medico', 'psicologia') AND MR.role = 'company_admin'), false)),
  ('mr-saude-ed', 'mod-saude', 'editor', COALESCE((SELECT BOOL_OR(MR."canAccess") FROM "ModuleRole" MR JOIN "Module" MM ON MR."moduleId" = MM.id WHERE MM.slug IN ('medico', 'psicologia') AND MR.role = 'editor'), false)),
  ('mr-saude-an', 'mod-saude', 'analista', COALESCE((SELECT BOOL_OR(MR."canAccess") FROM "ModuleRole" MR JOIN "Module" MM ON MR."moduleId" = MM.id WHERE MM.slug IN ('medico', 'psicologia') AND MR.role = 'analista'), false)),
  ('mr-saude-dir', 'mod-saude', 'diretoria', COALESCE((SELECT BOOL_OR(MR."canAccess") FROM "ModuleRole" MR JOIN "Module" MM ON MR."moduleId" = MM.id WHERE MM.slug IN ('medico', 'psicologia') AND MR.role = 'diretoria'), false)),
  ('mr-saude-med', 'mod-saude', 'medico', COALESCE((SELECT BOOL_OR(MR."canAccess") FROM "ModuleRole" MR JOIN "Module" MM ON MR."moduleId" = MM.id WHERE MM.slug IN ('medico', 'psicologia') AND MR.role = 'medico'), false)),
  ('mr-saude-psi', 'mod-saude', 'psicologo', COALESCE((SELECT BOOL_OR(MR."canAccess") FROM "ModuleRole" MR JOIN "Module" MM ON MR."moduleId" = MM.id WHERE MM.slug IN ('medico', 'psicologia') AND MR.role = 'psicologo'), false));

DELETE FROM "ModuleRole" WHERE "moduleId" IN (SELECT id FROM "Module" WHERE slug IN ('medico', 'psicologia'));
DELETE FROM "Module" WHERE slug IN ('medico', 'psicologia');
