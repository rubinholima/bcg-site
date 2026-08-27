-- Atendimento de jogo: múltiplos procedimentos e locais

ALTER TABLE "PhysioGameAttendance" ADD COLUMN "procedures" JSONB;
ALTER TABLE "PhysioGameAttendance" ADD COLUMN "bodyLocations" JSONB;

UPDATE "PhysioGameAttendance"
SET
  "procedures" = jsonb_build_array(
    jsonb_strip_nulls(
      jsonb_build_object(
        'procedureKey', "procedureKey",
        'procedureLabel', "procedureLabel"
      )
    )
  ),
  "bodyLocations" = jsonb_build_array(
    jsonb_strip_nulls(
      jsonb_build_object(
        'bodyLocation', "bodyLocation",
        'bodyLocationLabel', "bodyLocationLabel"
      )
    )
  )
WHERE "procedures" IS NULL;
