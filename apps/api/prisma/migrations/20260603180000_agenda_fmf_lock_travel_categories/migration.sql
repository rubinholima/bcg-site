-- Bloqueio de sync FMF após edição manual na agenda
ALTER TABLE "FootballAgendaEntry" ADD COLUMN IF NOT EXISTS "agendaLocked" BOOLEAN NOT NULL DEFAULT false;

-- Viagem com várias categorias (ex.: Sub-15 + Sub-17 juntas)
ALTER TABLE "TravelLogistics" ADD COLUMN IF NOT EXISTS "categories" JSONB;
