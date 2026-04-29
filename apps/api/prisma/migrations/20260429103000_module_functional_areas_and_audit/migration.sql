-- Agrupamento funcional na UI de permissões + tabela de auditoria

ALTER TABLE "Module" ADD COLUMN "functionalArea" TEXT NOT NULL DEFAULT 'outros';

CREATE INDEX "Module_functionalArea_idx" ON "Module"("functionalArea");

CREATE TABLE "PermissionMatrixAudit" (
    "id" TEXT NOT NULL,
    "actorSub" TEXT NOT NULL,
    "actorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" JSONB NOT NULL,

    CONSTRAINT "PermissionMatrixAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PermissionMatrixAudit_createdAt_idx" ON "PermissionMatrixAudit"("createdAt");

-- Backfill: chaves estáveis (nova coluna já default 'outros' — sobrescrever com CASE)
UPDATE "Module" SET "functionalArea" = CASE "slug"
    WHEN 'dashboard' THEN 'estrategico'
    WHEN 'grupo_master' THEN 'estrategico'
    WHEN 'diretoria' THEN 'estrategico'
    WHEN 'empresas' THEN 'empresa_usuarios'
    WHEN 'usuarios' THEN 'empresa_usuarios'
    WHEN 'tipos' THEN 'futebol_cadastro'
    WHEN 'medico' THEN 'saude_dados_sensiveis'
    WHEN 'psicologia' THEN 'saude_dados_sensiveis'
    WHEN 'juridico' THEN 'saude_dados_sensiveis'
    WHEN 'paginas' THEN 'conteudo_midia'
    WHEN 'noticias' THEN 'conteudo_midia'
    WHEN 'midia' THEN 'conteudo_midia'
    WHEN 'marketing' THEN 'conteudo_midia'
    WHEN 'eventos' THEN 'conteudo_midia'
    WHEN 'adm_financeiro' THEN 'adm_departamentos'
    WHEN 'adm_compras' THEN 'adm_departamentos'
    WHEN 'adm_estoque' THEN 'adm_departamentos'
    WHEN 'adm_rh' THEN 'adm_departamentos'
    WHEN 'adm_patrimonio' THEN 'adm_departamentos'
    WHEN 'adm_nutricao' THEN 'adm_departamentos'
    WHEN 'futebol_comissao' THEN 'futebol_tecnico'
    WHEN 'futebol_fisiologia' THEN 'futebol_tecnico'
    WHEN 'futebol_analise' THEN 'futebol_tecnico'
    WHEN 'futebol_logistica' THEN 'futebol_tecnico'
    WHEN 'relatorios' THEN 'relatorios_socio'
    WHEN 'socio_torcedor' THEN 'relatorios_socio'
    WHEN 'emails' THEN 'ferramentas'
    WHEN 'vault' THEN 'ferramentas'
    WHEN 'vault_manage' THEN 'ferramentas'
    WHEN 'vault_reveal' THEN 'ferramentas'
    WHEN 'vault_export' THEN 'ferramentas'
    WHEN 'configuracoes' THEN 'sistema'
    ELSE 'outros'
END;
