-- Cadastros de Logística — aeroportos, despesas, fornecedores, apoio, destinos, serviços

ALTER TABLE "LogisticsGuest" ADD COLUMN "guestType" TEXT;

CREATE TABLE "LogisticsAirport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsAirport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsExpenseCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsSupplierCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsSupplierCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsSupplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "document" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsSupplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsPointOfInterest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsPointOfInterest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsDestination" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsDestination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsServiceProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expenseCategoryId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsServiceProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LogisticsAirport_name_key" ON "LogisticsAirport"("name");
CREATE INDEX "LogisticsAirport_code_idx" ON "LogisticsAirport"("code");
CREATE UNIQUE INDEX "LogisticsExpenseCategory_name_key" ON "LogisticsExpenseCategory"("name");
CREATE UNIQUE INDEX "LogisticsSupplierCategory_name_key" ON "LogisticsSupplierCategory"("name");
CREATE UNIQUE INDEX "LogisticsSupplier_name_key" ON "LogisticsSupplier"("name");
CREATE INDEX "LogisticsSupplier_categoryId_idx" ON "LogisticsSupplier"("categoryId");
CREATE UNIQUE INDEX "LogisticsPointOfInterest_name_key" ON "LogisticsPointOfInterest"("name");
CREATE UNIQUE INDEX "LogisticsDestination_name_key" ON "LogisticsDestination"("name");
CREATE UNIQUE INDEX "LogisticsServiceProduct_name_key" ON "LogisticsServiceProduct"("name");
CREATE INDEX "LogisticsServiceProduct_expenseCategoryId_idx" ON "LogisticsServiceProduct"("expenseCategoryId");

ALTER TABLE "LogisticsSupplier" ADD CONSTRAINT "LogisticsSupplier_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LogisticsSupplierCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LogisticsServiceProduct" ADD CONSTRAINT "LogisticsServiceProduct_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "LogisticsExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Categorias de despesas (padrão Beatscode — bloqueadas)
INSERT INTO "LogisticsExpenseCategory" ("id", "name", "isSystem", "active", "sortOrder", "updatedAt") VALUES
  ('logec_alimentacao', 'ALIMENTAÇÃO', true, true, 1, CURRENT_TIMESTAMP),
  ('logec_transporte', 'TRANSPORTE', true, true, 2, CURRENT_TIMESTAMP),
  ('logec_hospedagem', 'HOSPEDAGEM', true, true, 3, CURRENT_TIMESTAMP),
  ('logec_receptivo', 'RECEPTIVO', true, true, 4, CURRENT_TIMESTAMP),
  ('logec_entretenimento', 'ENTRETENIMENTO', true, true, 5, CURRENT_TIMESTAMP);

-- Categorias de fornecedores (padrão Beatscode — bloqueadas)
INSERT INTO "LogisticsSupplierCategory" ("id", "name", "isSystem", "active", "sortOrder", "updatedAt") VALUES
  ('logsc_hotel', 'HOTEL', true, true, 1, CURRENT_TIMESTAMP),
  ('logsc_restaurante', 'RESTAURANTE', true, true, 2, CURRENT_TIMESTAMP),
  ('logsc_cia_aerea', 'CIA AÉREA', true, true, 3, CURRENT_TIMESTAMP),
  ('logsc_receptivo', 'RECEPTIVO', true, true, 4, CURRENT_TIMESTAMP),
  ('logsc_prestador', 'PRESTADOR DE SERVIÇOS', true, true, 5, CURRENT_TIMESTAMP);

-- Apoio logístico / locais de interesse (padrão — bloqueados)
INSERT INTO "LogisticsPointOfInterest" ("id", "name", "isSystem", "active", "sortOrder", "updatedAt") VALUES
  ('logpoi_farmacia', 'FARMÁCIA', true, true, 1, CURRENT_TIMESTAMP),
  ('logpoi_hospital', 'HOSPITAL', true, true, 2, CURRENT_TIMESTAMP),
  ('logpoi_restaurante', 'RESTAURANTE', true, true, 3, CURRENT_TIMESTAMP),
  ('logpoi_supermercado', 'SUPERMERCADO', true, true, 4, CURRENT_TIMESTAMP);

-- Serviços/produtos padrão (bloqueados)
INSERT INTO "LogisticsServiceProduct" ("id", "name", "expenseCategoryId", "isSystem", "active", "sortOrder", "updatedAt") VALUES
  ('logsp_receptivo', 'RECEPTIVO COMPLETO', 'logec_receptivo', true, true, 1, CURRENT_TIMESTAMP),
  ('logsp_diaria_hotel', 'DIÁRIAS DE HOTEL', 'logec_hospedagem', true, true, 2, CURRENT_TIMESTAMP),
  ('logsp_fretamento', 'FRETAMENTO ÔNIBUS', 'logec_transporte', true, true, 3, CURRENT_TIMESTAMP),
  ('logsp_taxi', 'TÁXI', 'logec_transporte', true, true, 4, CURRENT_TIMESTAMP),
  ('logsp_alimentacao', 'ALIMENTAÇÃO', 'logec_alimentacao', true, true, 5, CURRENT_TIMESTAMP);
