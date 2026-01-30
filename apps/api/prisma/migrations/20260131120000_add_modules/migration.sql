-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleRole" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "canAccess" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ModuleRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Module_slug_key" ON "Module"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleRole_moduleId_role_key" ON "ModuleRole"("moduleId", "role");

-- AddForeignKey
ALTER TABLE "ModuleRole" ADD CONSTRAINT "ModuleRole_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: módulos do dashboard
INSERT INTO "Module" ("id", "slug", "name", "sortOrder") VALUES
  ('mod-dashboard', 'dashboard', 'Dashboard', 1),
  ('mod-grupo-master', 'grupo_master', 'Grupo Master', 2),
  ('mod-usuarios', 'usuarios', 'Usuários', 3),
  ('mod-empresas', 'empresas', 'Empresas', 4),
  ('mod-tipos', 'tipos', 'Tipos', 5),
  ('mod-paginas', 'paginas', 'Páginas', 6),
  ('mod-noticias', 'noticias', 'Notícias', 7),
  ('mod-midia', 'midia', 'Mídia', 8),
  ('mod-configuracoes', 'configuracoes', 'Configurações', 9);

-- Seed: permissões (super_admin em todos; grupo_master só super_admin; resto company_admin e editor também)
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") VALUES
  ('mr-dash-sa', 'mod-dashboard', 'super_admin', true),
  ('mr-dash-ca', 'mod-dashboard', 'company_admin', true),
  ('mr-dash-ed', 'mod-dashboard', 'editor', true),
  ('mr-gm-sa', 'mod-grupo-master', 'super_admin', true),
  ('mr-usu-sa', 'mod-usuarios', 'super_admin', true),
  ('mr-usu-ca', 'mod-usuarios', 'company_admin', true),
  ('mr-usu-ed', 'mod-usuarios', 'editor', true),
  ('mr-emp-sa', 'mod-empresas', 'super_admin', true),
  ('mr-emp-ca', 'mod-empresas', 'company_admin', true),
  ('mr-emp-ed', 'mod-empresas', 'editor', true),
  ('mr-tip-sa', 'mod-tipos', 'super_admin', true),
  ('mr-tip-ca', 'mod-tipos', 'company_admin', true),
  ('mr-tip-ed', 'mod-tipos', 'editor', true),
  ('mr-pag-sa', 'mod-paginas', 'super_admin', true),
  ('mr-pag-ca', 'mod-paginas', 'company_admin', true),
  ('mr-pag-ed', 'mod-paginas', 'editor', true),
  ('mr-not-sa', 'mod-noticias', 'super_admin', true),
  ('mr-not-ca', 'mod-noticias', 'company_admin', true),
  ('mr-not-ed', 'mod-noticias', 'editor', true),
  ('mr-mid-sa', 'mod-midia', 'super_admin', true),
  ('mr-mid-ca', 'mod-midia', 'company_admin', true),
  ('mr-mid-ed', 'mod-midia', 'editor', true),
  ('mr-cfg-sa', 'mod-configuracoes', 'super_admin', true),
  ('mr-cfg-ca', 'mod-configuracoes', 'company_admin', true),
  ('mr-cfg-ed', 'mod-configuracoes', 'editor', true);
