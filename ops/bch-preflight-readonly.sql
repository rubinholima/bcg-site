SELECT slug, name FROM "Tenant" WHERE slug IN ('boston-city-hall', 'boston-city-fc-brasil') ORDER BY slug;
SELECT id, name FROM "TenantKind" WHERE name ILIKE ANY (ARRAY['LOCAL DE EVENTOS', 'EVENTOS', 'RESTAURANTE', 'CONSTRUTORA']) ORDER BY name;
SELECT COUNT(*)::int AS venue_space_count FROM "VenueSpace";
SELECT COUNT(*)::int AS bch_slug_count FROM "VenueSpace" WHERE "venueSlug" = 'boston-city-hall';
SELECT COUNT(*)::int AS booking_count FROM "VenueBooking";
SELECT COUNT(*)::int AS lead_count FROM "VenuePipelineLead";
SELECT migration_name, finished_at, rolled_back_at, logs FROM "_prisma_migrations" WHERE migration_name LIKE '%bch_venue_tenant%' OR finished_at IS NULL ORDER BY started_at DESC LIMIT 5;
