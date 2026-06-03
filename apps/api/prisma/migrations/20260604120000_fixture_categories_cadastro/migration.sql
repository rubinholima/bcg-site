-- CreateTable
CREATE TABLE "FixtureCategory" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "labelPT" TEXT NOT NULL,
    "labelEN" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixtureCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FixtureCategory_value_key" ON "FixtureCategory"("value");

-- Seed categorias padrão (mesmos slugs do sistema legado)
INSERT INTO "FixtureCategory" ("id", "value", "labelPT", "labelEN", "sortOrder", "active", "createdAt", "updatedAt") VALUES
  ('fcat_principal', 'principal', 'Principal', 'First Team', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fcat_modulo_ii', 'modulo_ii', 'Módulo II', 'Module II', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fcat_sub20', 'sub20', 'Sub-20', 'U-20', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fcat_sub17', 'sub17', 'Sub-17', 'U-17', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fcat_sub15', 'sub15', 'Sub-15', 'U-15', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fcat_sub14', 'sub14', 'Sub-14', 'U-14', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fcat_sub13', 'sub13', 'Sub-13', 'U-13', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fcat_sub11', 'sub11', 'Sub-11', 'U-11', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fcat_sub9', 'sub9', 'Sub-9', 'U-9', 8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fcat_feminino', 'feminino', 'Feminino', 'Women''s', 9, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
