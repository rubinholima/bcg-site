-- Cadastros auxiliares de Logística (Beatscode + extras BCG)

ALTER TABLE "TravelParticipant" ADD COLUMN "logisticsGuestId" TEXT;

CREATE TABLE "LogisticsTransportCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsTransportCompany_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsLoyaltyProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "transportCompanyId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsLoyaltyProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsUsageMoment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsUsageMoment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsPaymentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsPaymentType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsRoomType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsRoomType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsVisaType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsVisaType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsGuest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "phone" TEXT,
    "rg" TEXT,
    "rgIssuer" TEXT,
    "cpf" TEXT,
    "passport" TEXT,
    "passportExpiry" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsGuest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogisticsHotel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsHotel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LogisticsTransportCompany_name_key" ON "LogisticsTransportCompany"("name");
CREATE UNIQUE INDEX "LogisticsLoyaltyProgram_name_key" ON "LogisticsLoyaltyProgram"("name");
CREATE UNIQUE INDEX "LogisticsUsageMoment_name_key" ON "LogisticsUsageMoment"("name");
CREATE UNIQUE INDEX "LogisticsPaymentType_name_key" ON "LogisticsPaymentType"("name");
CREATE UNIQUE INDEX "LogisticsRoomType_name_key" ON "LogisticsRoomType"("name");
CREATE UNIQUE INDEX "LogisticsVisaType_name_key" ON "LogisticsVisaType"("name");
CREATE UNIQUE INDEX "LogisticsHotel_name_city_key" ON "LogisticsHotel"("name", "city");
CREATE INDEX "LogisticsHotel_name_idx" ON "LogisticsHotel"("name");
CREATE INDEX "LogisticsLoyaltyProgram_transportCompanyId_idx" ON "LogisticsLoyaltyProgram"("transportCompanyId");
CREATE INDEX "LogisticsGuest_tenantId_idx" ON "LogisticsGuest"("tenantId");
CREATE INDEX "LogisticsGuest_tenantId_name_idx" ON "LogisticsGuest"("tenantId", "name");
CREATE INDEX "TravelParticipant_logisticsGuestId_idx" ON "TravelParticipant"("logisticsGuestId");

ALTER TABLE "TravelParticipant" ADD CONSTRAINT "TravelParticipant_logisticsGuestId_fkey" FOREIGN KEY ("logisticsGuestId") REFERENCES "LogisticsGuest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LogisticsLoyaltyProgram" ADD CONSTRAINT "LogisticsLoyaltyProgram_transportCompanyId_fkey" FOREIGN KEY ("transportCompanyId") REFERENCES "LogisticsTransportCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LogisticsGuest" ADD CONSTRAINT "LogisticsGuest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Companhias de transporte (padrão Beatscode — bloqueadas)
INSERT INTO "LogisticsTransportCompany" ("id", "name", "isSystem", "active", "sortOrder", "updatedAt") VALUES
  ('logtc_azul', 'AZUL', true, true, 1, CURRENT_TIMESTAMP),
  ('logtc_gol', 'GOL', true, true, 2, CURRENT_TIMESTAMP),
  ('logtc_latam', 'LATAM', true, true, 3, CURRENT_TIMESTAMP),
  ('logtc_onibus_clube', 'ÔNIBUS CLUBE', true, true, 4, CURRENT_TIMESTAMP),
  ('logtc_onibus_fretado', 'ÔNIBUS FRETADO', true, true, 5, CURRENT_TIMESTAMP);

-- Programas de fidelidade
INSERT INTO "LogisticsLoyaltyProgram" ("id", "name", "transportCompanyId", "isSystem", "active", "sortOrder", "updatedAt") VALUES
  ('loglp_tudo_azul', 'TUDO AZUL', 'logtc_azul', true, true, 1, CURRENT_TIMESTAMP),
  ('loglp_smiles', 'SMILES', 'logtc_gol', true, true, 2, CURRENT_TIMESTAMP),
  ('loglp_multiplus', 'MULTIPLUS', 'logtc_latam', true, true, 3, CURRENT_TIMESTAMP);

-- Momentos de uso
INSERT INTO "LogisticsUsageMoment" ("id", "name", "isSystem", "active", "sortOrder", "updatedAt") VALUES
  ('logum_passeio', 'PASSEIO', true, true, 1, CURRENT_TIMESTAMP),
  ('logum_jogo', 'JOGO', true, true, 2, CURRENT_TIMESTAMP),
  ('logum_viagem', 'VIAGEM', true, true, 3, CURRENT_TIMESTAMP),
  ('logum_aquecimento', 'AQUECIMENTO', true, true, 4, CURRENT_TIMESTAMP),
  ('logum_viagem_concentracao', 'VIAGEM / CONCENTRAÇÃO', true, true, 5, CURRENT_TIMESTAMP),
  ('logum_treino', 'TREINO', true, true, 6, CURRENT_TIMESTAMP);

-- Tipos de pagamento (padrão operacional)
INSERT INTO "LogisticsPaymentType" ("id", "name", "isSystem", "active", "sortOrder", "updatedAt") VALUES
  ('logpt_cartao_corp', 'CARTÃO CORPORATIVO', true, true, 1, CURRENT_TIMESTAMP),
  ('logpt_faturado', 'FATURADO', true, true, 2, CURRENT_TIMESTAMP),
  ('logpt_pix', 'PIX', true, true, 3, CURRENT_TIMESTAMP),
  ('logpt_dinheiro', 'DINHEIRO', true, true, 4, CURRENT_TIMESTAMP),
  ('logpt_voucher', 'VOUCHER / REEMBOLSO', true, true, 5, CURRENT_TIMESTAMP);

-- Tipos de quarto
INSERT INTO "LogisticsRoomType" ("id", "name", "capacity", "isSystem", "active", "sortOrder", "updatedAt") VALUES
  ('logrt_single', 'SINGLE', 1, true, true, 1, CURRENT_TIMESTAMP),
  ('logrt_twin', 'TWIN', 2, true, true, 2, CURRENT_TIMESTAMP),
  ('logrt_suite', 'SUÍTE', 1, true, true, 3, CURRENT_TIMESTAMP),
  ('logrt_double', 'DOUBLE', 2, true, true, 4, CURRENT_TIMESTAMP),
  ('logrt_triplo', 'TRIPLO', 3, true, true, 5, CURRENT_TIMESTAMP),
  ('logrt_dorm4', 'DORMITÓRIO (4)', 4, true, true, 6, CURRENT_TIMESTAMP),
  ('logrt_dorm6', 'DORMITÓRIO (6)', 6, true, true, 7, CURRENT_TIMESTAMP),
  ('logrt_dorm8', 'DORMITÓRIO (8)', 8, true, true, 8, CURRENT_TIMESTAMP),
  ('logrt_quadruplo', 'QUÁDRUPLO', 4, true, true, 9, CURRENT_TIMESTAMP);

-- Tipos de visto
INSERT INTO "LogisticsVisaType" ("id", "name", "isSystem", "active", "sortOrder", "updatedAt") VALUES
  ('logvt_turismo', 'TURISMO', true, true, 1, CURRENT_TIMESTAMP),
  ('logvt_negocios', 'NEGÓCIOS E ACADÊMICOS', true, true, 2, CURRENT_TIMESTAMP),
  ('logvt_estudantes', 'ESTUDANTES', true, true, 3, CURRENT_TIMESTAMP);
