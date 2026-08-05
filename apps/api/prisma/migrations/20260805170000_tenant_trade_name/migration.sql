ALTER TABLE "Tenant" ADD COLUMN "tradeName" TEXT;

UPDATE "Tenant"
SET "tradeName" = 'Boston City'
WHERE slug = 'boston-city-fc-brasil';
