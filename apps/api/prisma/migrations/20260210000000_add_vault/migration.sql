-- CreateTable
CREATE TABLE "VaultItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "username" TEXT,
    "url" TEXT,
    "encryptedSecret" TEXT NOT NULL,
    "encryptedNotes" TEXT,
    "iv" TEXT NOT NULL,
    "notesIv" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "VaultItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "itemId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultAuditLog_pkey" PRIMARY KEY ("id")
);

-- Seed: módulos Vault (view, manage, reveal, export)
INSERT INTO "Module" ("id", "slug", "name", "sortOrder") VALUES
  ('mod-vault', 'vault', 'Senhas / Vault (ver)', 10),
  ('mod-vault-manage', 'vault_manage', 'Senhas / Vault (gerenciar)', 11),
  ('mod-vault-reveal', 'vault_reveal', 'Senhas / Vault (revelar/copiar)', 12),
  ('mod-vault-export', 'vault_export', 'Senhas / Vault (exportar)', 13);

-- Permissões: super_admin em todos; vault e vault_manage para company_admin e editor; vault_reveal e vault_export só super_admin por padrão
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") VALUES
  ('mr-v-sa', 'mod-vault', 'super_admin', true),
  ('mr-v-ca', 'mod-vault', 'company_admin', true),
  ('mr-v-ed', 'mod-vault', 'editor', true),
  ('mr-vm-sa', 'mod-vault-manage', 'super_admin', true),
  ('mr-vm-ca', 'mod-vault-manage', 'company_admin', true),
  ('mr-vm-ed', 'mod-vault-manage', 'editor', true),
  ('mr-vr-sa', 'mod-vault-reveal', 'super_admin', true),
  ('mr-vr-ca', 'mod-vault-reveal', 'company_admin', false),
  ('mr-vr-ed', 'mod-vault-reveal', 'editor', false),
  ('mr-ve-sa', 'mod-vault-export', 'super_admin', true),
  ('mr-ve-ca', 'mod-vault-export', 'company_admin', false),
  ('mr-ve-ed', 'mod-vault-export', 'editor', false);
