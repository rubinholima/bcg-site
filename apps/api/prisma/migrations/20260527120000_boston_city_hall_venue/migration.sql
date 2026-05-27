-- Boston City Hall: espaços, reservas e pipeline comercial

CREATE TABLE "VenueSpace" (
    "id" TEXT NOT NULL,
    "venueSlug" TEXT NOT NULL DEFAULT 'boston-city-hall',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "capacityStanding" INTEGER,
    "capacitySeated" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueSpace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenuePipelineLead" (
    "id" TEXT NOT NULL,
    "venueSlug" TEXT NOT NULL DEFAULT 'boston-city-hall',
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "companyName" TEXT,
    "eventType" TEXT,
    "guestCount" INTEGER,
    "preferredDate" TIMESTAMP(3),
    "message" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'lead',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenuePipelineLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueBooking" (
    "id" TEXT NOT NULL,
    "venueSlug" TEXT NOT NULL DEFAULT 'boston-city-hall',
    "spaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventType" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'hold',
    "pipelineLeadId" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "guestCount" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VenueSpace_venueSlug_slug_key" ON "VenueSpace"("venueSlug", "slug");
CREATE INDEX "VenueSpace_venueSlug_idx" ON "VenueSpace"("venueSlug");

CREATE INDEX "VenuePipelineLead_venueSlug_stage_idx" ON "VenuePipelineLead"("venueSlug", "stage");
CREATE INDEX "VenuePipelineLead_createdAt_idx" ON "VenuePipelineLead"("createdAt");

CREATE UNIQUE INDEX "VenueBooking_pipelineLeadId_key" ON "VenueBooking"("pipelineLeadId");
CREATE INDEX "VenueBooking_venueSlug_startAt_idx" ON "VenueBooking"("venueSlug", "startAt");
CREATE INDEX "VenueBooking_spaceId_idx" ON "VenueBooking"("spaceId");
CREATE INDEX "VenueBooking_status_idx" ON "VenueBooking"("status");

ALTER TABLE "VenueBooking" ADD CONSTRAINT "VenueBooking_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "VenueSpace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VenueBooking" ADD CONSTRAINT "VenueBooking_pipelineLeadId_fkey" FOREIGN KEY ("pipelineLeadId") REFERENCES "VenuePipelineLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
