-- Communication Center — hub unificado de canais (WhatsApp 1º; channel-agnostic)

CREATE TABLE "CommunicationChannelAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "externalId" TEXT,
    "displayAddress" TEXT,
    "credentialsEnc" TEXT,
    "credentialsIv" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunicationChannelAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channelAccountId" TEXT,
    "channelType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "externalContactId" TEXT,
    "subject" TEXT,
    "customerId" TEXT,
    "venuePipelineLeadId" TEXT,
    "linkedEntityType" TEXT,
    "linkedEntityId" TEXT,
    "assignedToUserId" TEXT,
    "assignedToName" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessagePreview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunicationConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "body" TEXT,
    "mediaUrl" TEXT,
    "mediaMimeType" TEXT,
    "externalId" TEXT,
    "deliveryStatus" TEXT,
    "sentByUserId" TEXT,
    "sentByName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunicationMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationNote" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunicationNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationTag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunicationTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationConversationTag" (
    "conversationId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "CommunicationConversationTag_pkey" PRIMARY KEY ("conversationId","tagId")
);

CREATE TABLE "CommunicationActivity" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" JSONB,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunicationActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "externalName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunicationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationChannelAccount_tenantId_channelType_externalId_key" ON "CommunicationChannelAccount"("tenantId", "channelType", "externalId");
CREATE INDEX "CommunicationChannelAccount_tenantId_idx" ON "CommunicationChannelAccount"("tenantId");
CREATE INDEX "CommunicationChannelAccount_channelType_externalId_idx" ON "CommunicationChannelAccount"("channelType", "externalId");

CREATE INDEX "CommunicationConversation_tenantId_status_idx" ON "CommunicationConversation"("tenantId", "status");
CREATE INDEX "CommunicationConversation_tenantId_channelType_idx" ON "CommunicationConversation"("tenantId", "channelType");
CREATE INDEX "CommunicationConversation_tenantId_lastMessageAt_idx" ON "CommunicationConversation"("tenantId", "lastMessageAt");
CREATE INDEX "CommunicationConversation_tenantId_isFavorite_idx" ON "CommunicationConversation"("tenantId", "isFavorite");
CREATE INDEX "CommunicationConversation_assignedToUserId_idx" ON "CommunicationConversation"("assignedToUserId");
CREATE INDEX "CommunicationConversation_customerId_idx" ON "CommunicationConversation"("customerId");
CREATE INDEX "CommunicationConversation_venuePipelineLeadId_idx" ON "CommunicationConversation"("venuePipelineLeadId");
CREATE INDEX "CommunicationConversation_contactPhone_idx" ON "CommunicationConversation"("contactPhone");
CREATE INDEX "CommunicationConversation_externalContactId_idx" ON "CommunicationConversation"("externalContactId");

CREATE INDEX "CommunicationMessage_conversationId_createdAt_idx" ON "CommunicationMessage"("conversationId", "createdAt");
CREATE INDEX "CommunicationMessage_externalId_idx" ON "CommunicationMessage"("externalId");

CREATE INDEX "CommunicationNote_conversationId_createdAt_idx" ON "CommunicationNote"("conversationId", "createdAt");

CREATE UNIQUE INDEX "CommunicationTag_tenantId_name_key" ON "CommunicationTag"("tenantId", "name");
CREATE INDEX "CommunicationTag_tenantId_idx" ON "CommunicationTag"("tenantId");

CREATE INDEX "CommunicationConversationTag_tagId_idx" ON "CommunicationConversationTag"("tagId");

CREATE INDEX "CommunicationActivity_conversationId_createdAt_idx" ON "CommunicationActivity"("conversationId", "createdAt");

CREATE INDEX "CommunicationTemplate_tenantId_channelType_idx" ON "CommunicationTemplate"("tenantId", "channelType");

ALTER TABLE "CommunicationChannelAccount" ADD CONSTRAINT "CommunicationChannelAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationConversation" ADD CONSTRAINT "CommunicationConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationConversation" ADD CONSTRAINT "CommunicationConversation_channelAccountId_fkey" FOREIGN KEY ("channelAccountId") REFERENCES "CommunicationChannelAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunicationConversation" ADD CONSTRAINT "CommunicationConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunicationConversation" ADD CONSTRAINT "CommunicationConversation_venuePipelineLeadId_fkey" FOREIGN KEY ("venuePipelineLeadId") REFERENCES "VenuePipelineLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunicationMessage" ADD CONSTRAINT "CommunicationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunicationConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationNote" ADD CONSTRAINT "CommunicationNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunicationConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationTag" ADD CONSTRAINT "CommunicationTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationConversationTag" ADD CONSTRAINT "CommunicationConversationTag_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunicationConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationConversationTag" ADD CONSTRAINT "CommunicationConversationTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CommunicationTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationActivity" ADD CONSTRAINT "CommunicationActivity_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunicationConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationTemplate" ADD CONSTRAINT "CommunicationTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Módulo de acesso
INSERT INTO "Module" ("id", "slug", "name", "sortOrder", "functionalArea")
SELECT 'mod-comunicacao', 'comunicacao', 'Communication Center', 26, 'ferramentas'
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'comunicacao');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-com-sa', m."id", 'super_admin', true FROM "Module" m WHERE m."slug" = 'comunicacao'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr JOIN "Module" mod ON mod."id" = mr."moduleId" WHERE mod."slug" = 'comunicacao' AND mr."role" = 'super_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-com-ca', m."id", 'company_admin', true FROM "Module" m WHERE m."slug" = 'comunicacao'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr JOIN "Module" mod ON mod."id" = mr."moduleId" WHERE mod."slug" = 'comunicacao' AND mr."role" = 'company_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-com-ed', m."id", 'editor', true FROM "Module" m WHERE m."slug" = 'comunicacao'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr JOIN "Module" mod ON mod."id" = mr."moduleId" WHERE mod."slug" = 'comunicacao' AND mr."role" = 'editor');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-com-ge', m."id", 'gerente', true FROM "Module" m WHERE m."slug" = 'comunicacao'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr JOIN "Module" mod ON mod."id" = mr."moduleId" WHERE mod."slug" = 'comunicacao' AND mr."role" = 'gerente');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-com-ad', m."id", 'administrativo', true FROM "Module" m WHERE m."slug" = 'comunicacao'
AND NOT EXISTS (SELECT 1 FROM "ModuleRole" mr JOIN "Module" mod ON mod."id" = mr."moduleId" WHERE mod."slug" = 'comunicacao' AND mr."role" = 'administrativo');
