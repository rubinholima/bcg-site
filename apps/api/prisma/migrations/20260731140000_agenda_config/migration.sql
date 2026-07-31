-- Configuração da agenda unificada — áreas e categorias com cores fixas

CREATE TABLE "AgendaArea" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataSource" TEXT NOT NULL,
    "moduleSlug" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "manageHref" TEXT NOT NULL,
    "createHref" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaArea_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgendaEventCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "areaSlug" TEXT,
    "eventType" TEXT,
    "matchSide" TEXT,
    "bgColor" TEXT NOT NULL,
    "textColor" TEXT NOT NULL,
    "borderColor" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaEventCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgendaArea_slug_key" ON "AgendaArea"("slug");
CREATE UNIQUE INDEX "AgendaEventCategory_slug_key" ON "AgendaEventCategory"("slug");
CREATE INDEX "AgendaEventCategory_areaSlug_idx" ON "AgendaEventCategory"("areaSlug");
CREATE INDEX "AgendaEventCategory_eventType_idx" ON "AgendaEventCategory"("eventType");

INSERT INTO "AgendaArea" ("id", "slug", "label", "dataSource", "moduleSlug", "isPublic", "manageHref", "createHref", "sortOrder", "isSystem", "updatedAt") VALUES
  ('agarea-futebol', 'futebol', 'Futebol', 'futebol', 'futebol_logistica', false, '/dashboard/futebol/logistica/agenda', '/dashboard/futebol/logistica/agenda?new=1', 10, true, CURRENT_TIMESTAMP),
  ('agarea-psicologia', 'psicologia', 'Psicologia', 'consultas', 'psicologia', false, '/dashboard/consultas', '/dashboard/consultas', 20, true, CURRENT_TIMESTAMP),
  ('agarea-boston-hall', 'boston-hall', 'Boston City Hall', 'boston-hall', 'eventos', false, '/dashboard/eventos/boston-city-hall/agenda', '/dashboard/eventos/boston-city-hall/reservas', 30, true, CURRENT_TIMESTAMP),
  ('agarea-marketing', 'marketing', 'Marketing', 'marketing', 'marketing', false, '/dashboard/marketing', '/dashboard/marketing', 40, true, CURRENT_TIMESTAMP);

INSERT INTO "AgendaEventCategory" ("id", "slug", "label", "areaSlug", "eventType", "matchSide", "bgColor", "textColor", "borderColor", "sortOrder", "isSystem", "updatedAt") VALUES
  ('agcat-aniversario', 'aniversario', 'Aniversário', NULL, 'aniversario', NULL, '#db2777', '#ffffff', '#f472b6', 10, true, CURRENT_TIMESTAMP),
  ('agcat-jogo-casa', 'jogo-casa', 'Jogo em casa', NULL, 'jogo', 'casa', '#059669', '#ffffff', '#34d399', 20, true, CURRENT_TIMESTAMP),
  ('agcat-jogo-fora', 'jogo-fora', 'Jogo fora', NULL, 'jogo', 'fora', '#f59e0b', '#18181b', '#fcd34d', 30, true, CURRENT_TIMESTAMP),
  ('agcat-viagem', 'viagem', 'Viagem / jogo fora', NULL, 'viagem', NULL, '#f59e0b', '#18181b', '#fcd34d', 35, true, CURRENT_TIMESTAMP),
  ('agcat-treino', 'treino', 'Treino', NULL, 'treino', NULL, '#0d9488', '#ffffff', '#2dd4bf', 40, true, CURRENT_TIMESTAMP),
  ('agcat-reuniao', 'reuniao', 'Reunião', NULL, 'reuniao', NULL, '#0284c7', '#ffffff', '#38bdf8', 50, true, CURRENT_TIMESTAMP),
  ('agcat-jogo', 'jogo', 'Jogo', NULL, 'jogo', NULL, '#7c3aed', '#ffffff', '#a78bfa', 55, true, CURRENT_TIMESTAMP),
  ('agcat-compromisso', 'compromisso', 'Compromisso', NULL, 'compromisso', NULL, '#0891b2', '#ffffff', '#22d3ee', 60, true, CURRENT_TIMESTAMP),
  ('agcat-preparacao', 'preparacao', 'Preparação', NULL, 'preparacao', NULL, '#ea580c', '#ffffff', '#fb923c', 70, true, CURRENT_TIMESTAMP),
  ('agcat-palco', 'palco', 'Boston City Hall', NULL, 'palco', NULL, '#c026d3', '#ffffff', '#e879f9', 80, true, CURRENT_TIMESTAMP),
  ('agcat-outro', 'outro', 'Outro', NULL, 'outro', NULL, '#52525b', '#ffffff', '#a1a1aa', 90, true, CURRENT_TIMESTAMP),
  ('agcat-psi', 'consulta-psicologia', 'Consulta psicologia', 'psicologia', NULL, NULL, '#059669', '#ffffff', '#34d399', 100, true, CURRENT_TIMESTAMP),
  ('agcat-bch', 'reserva-boston-hall', 'Reserva Boston City Hall', 'boston-hall', NULL, NULL, '#d97706', '#ffffff', '#fbbf24', 110, true, CURRENT_TIMESTAMP),
  ('agcat-mkt', 'publicacao-marketing', 'Publicação marketing', 'marketing', NULL, NULL, '#7c3aed', '#ffffff', '#a78bfa', 120, true, CURRENT_TIMESTAMP);
