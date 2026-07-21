-- Nomes dos perfis sempre em maiúsculas (pt-BR)

UPDATE "PlatformRole"
SET "label" = UPPER("label"),
    "updatedAt" = CURRENT_TIMESTAMP;
