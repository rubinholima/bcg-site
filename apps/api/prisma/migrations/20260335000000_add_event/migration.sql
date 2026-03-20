-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizer" TEXT NOT NULL,
    "tenantId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'football',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "logoUrl" TEXT,
    "content" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_organizer_idx" ON "Event"("organizer");

-- CreateIndex
CREATE INDEX "Event_tenantId_idx" ON "Event"("tenantId");

-- CreateIndex
CREATE INDEX "Event_category_idx" ON "Event"("category");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Module eventos
INSERT INTO "Module" ("id", "slug", "name", "sortOrder")
SELECT 'mod-eventos', 'eventos', 'Eventos', 70
WHERE NOT EXISTS (SELECT 1 FROM "Module" WHERE "slug" = 'eventos');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-evt-sa', 'mod-eventos', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-eventos' AND "role" = 'super_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-evt-ca', 'mod-eventos', 'company_admin', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-eventos' AND "role" = 'company_admin');

INSERT INTO "ModuleRole" ("id", "moduleId", "role", "canAccess")
SELECT 'mr-evt-ed', 'mod-eventos', 'editor', true
WHERE NOT EXISTS (SELECT 1 FROM "ModuleRole" WHERE "moduleId" = 'mod-eventos' AND "role" = 'editor');
