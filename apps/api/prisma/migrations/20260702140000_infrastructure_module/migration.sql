-- Infraestrutura TI — extensão técnica do Patrimônio (sem duplicar Asset)

CREATE TABLE "InfrastructureRack" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "totalUnits" INTEGER NOT NULL DEFAULT 42,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InfrastructureRack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetInfrastructureProfile" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "hostname" TEXT,
    "identity" TEXT,
    "ipAddress" TEXT,
    "subnetMask" TEXT,
    "gateway" TEXT,
    "dns" TEXT,
    "macAddress" TEXT,
    "operatingSystem" TEXT,
    "firmware" TEXT,
    "version" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "rackId" TEXT,
    "rackPositionU" INTEGER,
    "rackSide" TEXT,
    "infraStatus" TEXT,
    "vlan" TEXT,
    "bridge" TEXT,
    "bond" TEXT,
    "technicalNotes" TEXT,
    "monitoringNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetInfrastructureProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetNetworkInterface" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "speed" TEXT,
    "status" TEXT,
    "description" TEXT,
    "connectedTo" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetNetworkInterface_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetTopologyLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceAssetId" TEXT NOT NULL,
    "targetAssetId" TEXT NOT NULL,
    "connectionType" TEXT NOT NULL,
    "speed" TEXT,
    "length" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetTopologyLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetBackboneFiber" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "equipmentAssetId" TEXT,
    "port" TEXT,
    "fiberType" TEXT,
    "speed" TEXT,
    "status" TEXT,
    "photoUrls" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetBackboneFiber_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetInfrastructureDocument" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileKey" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetInfrastructureDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetInfrastructureBackup" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "backupType" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileKey" TEXT,
    "version" TEXT,
    "backupDate" TIMESTAMP(3),
    "responsibleName" TEXT,
    "comments" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetInfrastructureBackup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetInfrastructureCredential" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "username" TEXT,
    "secretEnc" TEXT,
    "secretIv" TEXT,
    "url" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "lastChangedAt" TIMESTAMP(3),
    "responsibleName" TEXT,
    "vaultItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetInfrastructureCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetInfrastructureCredentialAuditLog" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetInfrastructureCredentialAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetSoftwareInstall" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "licenseKey" TEXT,
    "licenseRef" TEXT,
    "installedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetSoftwareInstall_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetDisasterRecoveryPlan" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "checklist" JSONB,
    "procedure" TEXT,
    "estimatedTime" TEXT,
    "prerequisites" TEXT,
    "relatedFiles" JSONB,
    "backupRefs" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetDisasterRecoveryPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetInfrastructureAuditLog" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetInfrastructureAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetInfrastructureProfile_assetId_key" ON "AssetInfrastructureProfile"("assetId");
CREATE INDEX "InfrastructureRack_tenantId_idx" ON "InfrastructureRack"("tenantId");
CREATE INDEX "AssetInfrastructureProfile_rackId_idx" ON "AssetInfrastructureProfile"("rackId");
CREATE INDEX "AssetNetworkInterface_profileId_idx" ON "AssetNetworkInterface"("profileId");
CREATE INDEX "AssetTopologyLink_tenantId_idx" ON "AssetTopologyLink"("tenantId");
CREATE INDEX "AssetTopologyLink_sourceAssetId_idx" ON "AssetTopologyLink"("sourceAssetId");
CREATE INDEX "AssetTopologyLink_targetAssetId_idx" ON "AssetTopologyLink"("targetAssetId");
CREATE INDEX "AssetBackboneFiber_tenantId_idx" ON "AssetBackboneFiber"("tenantId");
CREATE INDEX "AssetBackboneFiber_equipmentAssetId_idx" ON "AssetBackboneFiber"("equipmentAssetId");
CREATE INDEX "AssetInfrastructureDocument_profileId_idx" ON "AssetInfrastructureDocument"("profileId");
CREATE INDEX "AssetInfrastructureBackup_profileId_idx" ON "AssetInfrastructureBackup"("profileId");
CREATE INDEX "AssetInfrastructureCredential_profileId_idx" ON "AssetInfrastructureCredential"("profileId");
CREATE INDEX "AssetInfrastructureCredentialAuditLog_credentialId_idx" ON "AssetInfrastructureCredentialAuditLog"("credentialId");
CREATE INDEX "AssetSoftwareInstall_profileId_idx" ON "AssetSoftwareInstall"("profileId");
CREATE UNIQUE INDEX "AssetDisasterRecoveryPlan_profileId_key" ON "AssetDisasterRecoveryPlan"("profileId");
CREATE INDEX "AssetInfrastructureAuditLog_profileId_idx" ON "AssetInfrastructureAuditLog"("profileId");

ALTER TABLE "InfrastructureRack" ADD CONSTRAINT "InfrastructureRack_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetInfrastructureProfile" ADD CONSTRAINT "AssetInfrastructureProfile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetInfrastructureProfile" ADD CONSTRAINT "AssetInfrastructureProfile_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "InfrastructureRack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetNetworkInterface" ADD CONSTRAINT "AssetNetworkInterface_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AssetInfrastructureProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetTopologyLink" ADD CONSTRAINT "AssetTopologyLink_sourceAssetId_fkey" FOREIGN KEY ("sourceAssetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetTopologyLink" ADD CONSTRAINT "AssetTopologyLink_targetAssetId_fkey" FOREIGN KEY ("targetAssetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetBackboneFiber" ADD CONSTRAINT "AssetBackboneFiber_equipmentAssetId_fkey" FOREIGN KEY ("equipmentAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetInfrastructureDocument" ADD CONSTRAINT "AssetInfrastructureDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AssetInfrastructureProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetInfrastructureBackup" ADD CONSTRAINT "AssetInfrastructureBackup_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AssetInfrastructureProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetInfrastructureCredential" ADD CONSTRAINT "AssetInfrastructureCredential_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AssetInfrastructureProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetInfrastructureCredentialAuditLog" ADD CONSTRAINT "AssetInfrastructureCredentialAuditLog_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "AssetInfrastructureCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetSoftwareInstall" ADD CONSTRAINT "AssetSoftwareInstall_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AssetInfrastructureProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetDisasterRecoveryPlan" ADD CONSTRAINT "AssetDisasterRecoveryPlan_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AssetInfrastructureProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetInfrastructureAuditLog" ADD CONSTRAINT "AssetInfrastructureAuditLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AssetInfrastructureProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Módulo de acesso (mesmos perfis do ADM TI)
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-infraestrutura', 'infraestrutura', 'Infraestrutura TI', 24
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'infraestrutura');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-infra-sa', m."id", 'super_admin', true FROM "Module" m WHERE m."slug" = 'infraestrutura'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr JOIN "Module" mod ON mod."id" = mr."moduleId" WHERE mod."slug" = 'infraestrutura' AND mr."role" = 'super_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-infra-ca', m."id", 'company_admin', true FROM "Module" m WHERE m."slug" = 'infraestrutura'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr JOIN "Module" mod ON mod."id" = mr."moduleId" WHERE mod."slug" = 'infraestrutura' AND mr."role" = 'company_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-infra-ed', m."id", 'editor', true FROM "Module" m WHERE m."slug" = 'infraestrutura'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr JOIN "Module" mod ON mod."id" = mr."moduleId" WHERE mod."slug" = 'infraestrutura' AND mr."role" = 'editor');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-infra-ge', m."id", 'gerente', true FROM "Module" m WHERE m."slug" = 'infraestrutura'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr JOIN "Module" mod ON mod."id" = mr."moduleId" WHERE mod."slug" = 'infraestrutura' AND mr."role" = 'gerente');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-infra-ad', m."id", 'administrativo', true FROM "Module" m WHERE m."slug" = 'infraestrutura'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr JOIN "Module" mod ON mod."id" = mr."moduleId" WHERE mod."slug" = 'infraestrutura' AND mr."role" = 'administrativo');
