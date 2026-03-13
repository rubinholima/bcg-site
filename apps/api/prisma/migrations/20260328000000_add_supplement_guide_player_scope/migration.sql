-- AlterTable
ALTER TABLE "SupplementGuide" ADD COLUMN IF NOT EXISTS "playerId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupplementGuide_playerId_idx" ON "SupplementGuide"("playerId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SupplementGuide_playerId_fkey'
  ) THEN
    ALTER TABLE "SupplementGuide" ADD CONSTRAINT "SupplementGuide_playerId_fkey"
      FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
