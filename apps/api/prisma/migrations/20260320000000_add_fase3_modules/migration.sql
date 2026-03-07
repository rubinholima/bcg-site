-- Fase 3: Novos módulos Adm, Futebol (Comissão, Fisiologia, Análise), Relatórios, Sócio Torcedor, Marketing

-- Adm
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-adm-financeiro', 'adm_financeiro', 'Financeiro', 20
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'adm_financeiro');
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-adm-compras', 'adm_compras', 'Compras', 21
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'adm_compras');
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-adm-rh', 'adm_rh', 'RH', 22
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'adm_rh');
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-adm-patrimonio', 'adm_patrimonio', 'Patrimônio', 23
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'adm_patrimonio');
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-adm-nutricao', 'adm_nutricao', 'Nutrição', 24
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'adm_nutricao');
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-adm-estoque', 'adm_estoque', 'Estoque', 25
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'adm_estoque');

-- Futebol (Comissão técnica, Fisiologia, Análise/Desempenho)
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-futebol-comissao', 'futebol_comissao', 'Comissão técnica', 26
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_comissao');
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-futebol-fisiologia', 'futebol_fisiologia', 'Fisiologia', 27
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_fisiologia');
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-futebol-analise', 'futebol_analise', 'Desempenho (análise)', 28
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'futebol_analise');

-- Relatórios
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-relatorios', 'relatorios', 'Relatórios', 29
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'relatorios');

-- Sócio Torcedor e Marketing
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-socio-torcedor', 'socio_torcedor', 'Sócio Torcedor', 30
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'socio_torcedor');
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-marketing', 'marketing', 'Marketing', 31
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'marketing');

-- ModuleRole para adm_financeiro
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-afin-sa', 'mod-adm-financeiro', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-financeiro' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-afin-ca', 'mod-adm-financeiro', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-financeiro' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-afin-ed', 'mod-adm-financeiro', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-financeiro' AND "role" = 'editor');
-- adm_compras
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-acom-sa', 'mod-adm-compras', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-compras' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-acom-ca', 'mod-adm-compras', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-compras' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-acom-ed', 'mod-adm-compras', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-compras' AND "role" = 'editor');
-- adm_rh
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-arh-sa', 'mod-adm-rh', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-rh' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-arh-ca', 'mod-adm-rh', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-rh' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-arh-ed', 'mod-adm-rh', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-rh' AND "role" = 'editor');
-- adm_patrimonio
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-apat-sa', 'mod-adm-patrimonio', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-patrimonio' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-apat-ca', 'mod-adm-patrimonio', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-patrimonio' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-apat-ed', 'mod-adm-patrimonio', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-patrimonio' AND "role" = 'editor');
-- adm_nutricao
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-anut-sa', 'mod-adm-nutricao', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-nutricao' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-anut-ca', 'mod-adm-nutricao', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-nutricao' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-anut-ed', 'mod-adm-nutricao', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-nutricao' AND "role" = 'editor');
-- adm_estoque
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-aest-sa', 'mod-adm-estoque', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-estoque' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-aest-ca', 'mod-adm-estoque', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-estoque' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-aest-ed', 'mod-adm-estoque', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-adm-estoque' AND "role" = 'editor');
-- futebol_comissao
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fcom-sa', 'mod-futebol-comissao', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-comissao' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fcom-ca', 'mod-futebol-comissao', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-comissao' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fcom-ed', 'mod-futebol-comissao', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-comissao' AND "role" = 'editor');
-- futebol_fisiologia
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-ffis-sa', 'mod-futebol-fisiologia', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-fisiologia' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-ffis-ca', 'mod-futebol-fisiologia', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-fisiologia' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-ffis-ed', 'mod-futebol-fisiologia', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-fisiologia' AND "role" = 'editor');
-- futebol_analise
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fana-sa', 'mod-futebol-analise', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-analise' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fana-ca', 'mod-futebol-analise', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-analise' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-fana-ed', 'mod-futebol-analise', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-futebol-analise' AND "role" = 'editor');
-- relatorios
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-rel-sa', 'mod-relatorios', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-relatorios' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-rel-ca', 'mod-relatorios', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-relatorios' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-rel-ed', 'mod-relatorios', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-relatorios' AND "role" = 'editor');
-- socio_torcedor
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-soc-sa', 'mod-socio-torcedor', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-socio-torcedor' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-soc-ca', 'mod-socio-torcedor', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-socio-torcedor' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-soc-ed', 'mod-socio-torcedor', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-socio-torcedor' AND "role" = 'editor');
-- marketing
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-mkt-sa', 'mod-marketing', 'super_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-marketing' AND "role" = 'super_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-mkt-ca', 'mod-marketing', 'company_admin', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-marketing' AND "role" = 'company_admin');
INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess") SELECT 'mr-mkt-ed', 'mod-marketing', 'editor', true WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-marketing' AND "role" = 'editor');
