-- Atendimentos privados: visíveis só na Agenda Psicologia (não na Agenda Geral)
ALTER TABLE "PsychologySession" ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;

UPDATE "AgendaArea"
SET "manageHref" = '/dashboard/psicologia/agenda',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'psicologia';
