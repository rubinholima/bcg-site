-- Perfil estendido de cadastro de atletas (dados pessoais, endereço, extras, etc.)
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "registrationProfile" JSONB;
