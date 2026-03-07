-- Contato/responsável em caso de emergência
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT;
