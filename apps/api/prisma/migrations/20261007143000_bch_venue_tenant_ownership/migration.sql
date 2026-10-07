-- BCH Fase 1.1: ownership formal via Tenant (preserva venueSlug e registros existentes)

ALTER TABLE "VenueSpace" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "VenueBooking" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "VenuePipelineLead" ADD COLUMN "tenantId" TEXT;

UPDATE "VenueSpace" AS vs
SET "tenantId" = t.id
FROM "Tenant" AS t
WHERE t.slug = 'boston-city-hall'
  AND vs."venueSlug" = 'boston-city-hall';

UPDATE "VenueBooking" AS vb
SET "tenantId" = t.id
FROM "Tenant" AS t
WHERE t.slug = 'boston-city-hall'
  AND vb."venueSlug" = 'boston-city-hall';

UPDATE "VenuePipelineLead" AS vpl
SET "tenantId" = t.id
FROM "Tenant" AS t
WHERE t.slug = 'boston-city-hall'
  AND vpl."venueSlug" = 'boston-city-hall';

ALTER TABLE "VenueSpace" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "VenueBooking" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "VenuePipelineLead" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "VenueSpace"
  ADD CONSTRAINT "VenueSpace_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VenueBooking"
  ADD CONSTRAINT "VenueBooking_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VenuePipelineLead"
  ADD CONSTRAINT "VenuePipelineLead_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "VenueSpace_tenantId_idx" ON "VenueSpace"("tenantId");
CREATE INDEX "VenueBooking_tenantId_idx" ON "VenueBooking"("tenantId");
CREATE INDEX "VenuePipelineLead_tenantId_idx" ON "VenuePipelineLead"("tenantId");
