-- Add contact email and phone (WhatsApp) to Player for consultation link notification
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
