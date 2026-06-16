-- Prospect: aprovação supervisor + status jurídico + estágio cadastrado

ALTER TABLE "ScoutingProspect" ADD COLUMN "supervisorApprovedAt" TIMESTAMP(3);
ALTER TABLE "ScoutingProspect" ADD COLUMN "supervisorApprovedBy" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN "supervisorNotes" TEXT;
ALTER TABLE "ScoutingProspect" ADD COLUMN "legalStatus" TEXT DEFAULT 'pendente';
