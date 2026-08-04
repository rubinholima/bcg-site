-- Agenda: período manhã/tarde/noite
ALTER TABLE "FootballAgendaEntry" ADD COLUMN IF NOT EXISTS "dayPeriod" TEXT;

-- Viagem: itinerário, hotel stay, uniformes
ALTER TABLE "TravelLogistics" ADD COLUMN IF NOT EXISTS "hotelStay" JSONB;
ALTER TABLE "TravelLogistics" ADD COLUMN IF NOT EXISTS "itinerary" JSONB;
ALTER TABLE "TravelLogistics" ADD COLUMN IF NOT EXISTS "uniforms" JSONB;
