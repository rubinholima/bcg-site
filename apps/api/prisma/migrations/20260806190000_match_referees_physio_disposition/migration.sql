-- Cadastro de árbitros (foto + dados para Press Kit)
CREATE TABLE "MatchReferee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "federation" TEXT,
    "licenseNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchReferee_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchReferee_name_idx" ON "MatchReferee"("name");
CREATE INDEX "MatchReferee_active_idx" ON "MatchReferee"("active");

-- Desfecho do atendimento de fisioterapia
ALTER TABLE "PhysioSession" ADD COLUMN "disposition" TEXT;
