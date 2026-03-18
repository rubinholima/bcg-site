-- AlterTable: adiciona coluna country ao Stadium (usado em Logística para preencher cidade/país automaticamente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Stadium' AND column_name = 'country'
  ) THEN
    ALTER TABLE "Stadium" ADD COLUMN "country" TEXT;
  END IF;
END $$;
