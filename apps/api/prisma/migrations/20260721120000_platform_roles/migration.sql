-- Catálogo de perfis (roles) da plataforma + seed dos valores atuais

CREATE TABLE "PlatformRole" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "canAccessDashboard" BOOLEAN NOT NULL DEFAULT true,
    "includeInMatrix" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformRole_slug_key" ON "PlatformRole"("slug");
CREATE INDEX "PlatformRole_sortOrder_idx" ON "PlatformRole"("sortOrder");
CREATE INDEX "PlatformRole_isActive_idx" ON "PlatformRole"("isActive");

INSERT INTO "PlatformRole" ("id", "slug", "label", "sortOrder", "canAccessDashboard", "includeInMatrix", "isSystem", "isActive", "updatedAt") VALUES
  ('prole_super_admin', 'super_admin', 'Super admin', 0, true, false, true, true, CURRENT_TIMESTAMP),
  ('prole_company_admin', 'company_admin', 'Admin da empresa', 10, true, true, true, true, CURRENT_TIMESTAMP),
  ('prole_editor', 'editor', 'Editor', 20, true, true, true, true, CURRENT_TIMESTAMP),
  ('prole_gerente', 'gerente', 'Gerente', 30, true, true, true, true, CURRENT_TIMESTAMP),
  ('prole_administrativo', 'administrativo', 'Administrativo', 40, true, true, true, true, CURRENT_TIMESTAMP),
  ('prole_analista', 'analista', 'Analista', 50, true, true, true, true, CURRENT_TIMESTAMP),
  ('prole_diretoria', 'diretoria', 'Diretoria', 60, true, true, true, true, CURRENT_TIMESTAMP),
  ('prole_medico', 'medico', 'Médico', 70, true, true, true, true, CURRENT_TIMESTAMP),
  ('prole_psicologo', 'psicologo', 'Psicólogo', 80, true, true, true, true, CURRENT_TIMESTAMP),
  ('prole_comissao', 'comissao', 'Comissão', 90, true, true, true, true, CURRENT_TIMESTAMP),
  ('prole_user', 'user', 'Usuário básico', 100, false, false, true, true, CURRENT_TIMESTAMP);
