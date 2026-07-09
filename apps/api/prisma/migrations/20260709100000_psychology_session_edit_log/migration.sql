-- Histórico de edições/comentários em sessões de psicologia (relatórios semanais)
ALTER TABLE "PsychologySession" ADD COLUMN IF NOT EXISTS "editLog" JSONB;
