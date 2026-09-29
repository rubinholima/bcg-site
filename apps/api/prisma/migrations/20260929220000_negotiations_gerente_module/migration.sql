-- Atletas negociados: gestão do programa (gerente) — não comissão/supervisor/técnico
UPDATE "ModuleRole" mr
SET "canAccess" = true
FROM "Module" m
WHERE mr."moduleId" = m."id"
  AND m."slug" = 'cad_jogadores_negociados'
  AND mr."role" = 'gerente';
