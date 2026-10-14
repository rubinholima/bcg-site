-- BCH unified event management (additive)

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "bchVenueSpaceId" TEXT;

CREATE TABLE IF NOT EXISTS "BchEventTeamMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "employeeId" TEXT,
    "userId" TEXT,
    "contractorName" TEXT,
    "supplierId" TEXT,
    "roleLabel" TEXT NOT NULL,
    "areaLabel" TEXT,
    "responsibility" TEXT,
    "supervisorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchEventTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BchEventOperationalTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ownerTeamMemberId" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchEventOperationalTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BchTicketBuyerProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "customerId" TEXT,
    "displayName" TEXT,
    "phone" TEXT,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "marketingOptInAt" TIMESTAMP(3),
    "marketingOptInSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BchTicketBuyerProfile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BchEventStaffAssignment" ADD COLUMN IF NOT EXISTS "teamMemberId" TEXT;

ALTER TABLE "BchEventScheduleItem" ADD COLUMN IF NOT EXISTS "responsibleTeamMemberId" TEXT;

CREATE INDEX IF NOT EXISTS "Event_bchVenueSpaceId_idx" ON "Event"("bchVenueSpaceId");
CREATE INDEX IF NOT EXISTS "BchEventTeamMember_tenantId_eventId_status_idx" ON "BchEventTeamMember"("tenantId", "eventId", "status");
CREATE INDEX IF NOT EXISTS "BchEventTeamMember_employeeId_idx" ON "BchEventTeamMember"("employeeId");
CREATE INDEX IF NOT EXISTS "BchEventStaffAssignment_teamMemberId_idx" ON "BchEventStaffAssignment"("teamMemberId");
CREATE INDEX IF NOT EXISTS "BchEventOperationalTask_tenantId_eventId_status_idx" ON "BchEventOperationalTask"("tenantId", "eventId", "status");
CREATE INDEX IF NOT EXISTS "BchEventOperationalTask_tenantId_eventId_dueAt_idx" ON "BchEventOperationalTask"("tenantId", "eventId", "dueAt");
CREATE INDEX IF NOT EXISTS "BchTicketBuyerProfile_tenantId_idx" ON "BchTicketBuyerProfile"("tenantId");
CREATE INDEX IF NOT EXISTS "BchTicketBuyerProfile_customerId_idx" ON "BchTicketBuyerProfile"("customerId");
CREATE UNIQUE INDEX IF NOT EXISTS "BchTicketBuyerProfile_tenantId_emailNormalized_key" ON "BchTicketBuyerProfile"("tenantId", "emailNormalized");

DO $$ BEGIN
  ALTER TABLE "Event" ADD CONSTRAINT "Event_bchVenueSpaceId_fkey" FOREIGN KEY ("bchVenueSpaceId") REFERENCES "VenueSpace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BchEventTeamMember" ADD CONSTRAINT "BchEventTeamMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BchEventTeamMember" ADD CONSTRAINT "BchEventTeamMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BchEventTeamMember" ADD CONSTRAINT "BchEventTeamMember_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BchEventTeamMember" ADD CONSTRAINT "BchEventTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BchEventTeamMember" ADD CONSTRAINT "BchEventTeamMember_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BchEventTeamMember" ADD CONSTRAINT "BchEventTeamMember_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "BchEventTeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BchEventStaffAssignment" ADD CONSTRAINT "BchEventStaffAssignment_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "BchEventTeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BchEventScheduleItem" ADD CONSTRAINT "BchEventScheduleItem_responsibleTeamMemberId_fkey" FOREIGN KEY ("responsibleTeamMemberId") REFERENCES "BchEventTeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BchEventOperationalTask" ADD CONSTRAINT "BchEventOperationalTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BchEventOperationalTask" ADD CONSTRAINT "BchEventOperationalTask_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BchEventOperationalTask" ADD CONSTRAINT "BchEventOperationalTask_ownerTeamMemberId_fkey" FOREIGN KEY ("ownerTeamMemberId") REFERENCES "BchEventTeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BchTicketBuyerProfile" ADD CONSTRAINT "BchTicketBuyerProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BchTicketBuyerProfile" ADD CONSTRAINT "BchTicketBuyerProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill venue space from linked booking when event has no explicit space
UPDATE "Event" e
SET "bchVenueSpaceId" = vb."spaceId"
FROM "VenueBooking" vb
WHERE vb."eventId" = e."id"
  AND e."bchVenueSpaceId" IS NULL
  AND vb."spaceId" IS NOT NULL;
