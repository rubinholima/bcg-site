-- Unifica LogisticsSupplier → Supplier (cadastro único por tenant/clube).
-- 1) Copia fornecedores da logística para cada clube de futebol (sem duplicar por nome).
-- 2) Remapeia supplierId em TravelLogistics.beatscodeMeta (logisticsCadastros + expenseLines).
-- 3) Remove tabelas antigas da logística.

-- Clubes de futebol (mesma heurística da API de logística)
CREATE TEMP TABLE _club_tenants AS
SELECT t.id
FROM "Tenant" t
INNER JOIN "TenantKind" tk ON tk.id = t."kindId"
WHERE (
  lower(tk.name) LIKE '%futebol%'
  OR lower(tk.name) LIKE '%clube%'
  OR lower(tk.name) LIKE '%football%'
)
AND lower(tk.name) NOT LIKE '%construtora%'
AND lower(tk.name) NOT LIKE '%real estate%'
AND lower(tk.name) NOT LIKE '%construção%';

-- Copia LogisticsSupplier → Supplier por clube
INSERT INTO "Supplier" (
  id,
  "tenantId",
  name,
  document,
  "contactName",
  email,
  phone,
  notes,
  "createdAt",
  "updatedAt"
)
SELECT
  'lgs_' || ls.id || '_' || ct.id,
  ct.id,
  ls.name,
  ls.document,
  ls."contactName",
  ls.email,
  ls.phone,
  CASE
    WHEN c.name IS NOT NULL THEN 'CATEGORIA (LOGÍSTICA): ' || c.name
    ELSE NULL
  END,
  NOW(),
  NOW()
FROM "LogisticsSupplier" ls
CROSS JOIN _club_tenants ct
LEFT JOIN "LogisticsSupplierCategory" c ON c.id = ls."categoryId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "Supplier" s
  WHERE s."tenantId" = ct.id
    AND lower(s.name) = lower(ls.name)
);

-- Remapeia IDs nas viagens
DO $$
DECLARE
  r RECORD;
  meta jsonb;
  old_id text;
  old_name text;
  new_id text;
  lines jsonb;
  line jsonb;
  i int;
  line_old text;
  line_name text;
  line_new text;
  changed boolean;
BEGIN
  FOR r IN
    SELECT id, "tenantId", "beatscodeMeta"
    FROM "TravelLogistics"
    WHERE "beatscodeMeta" IS NOT NULL
  LOOP
    meta := r."beatscodeMeta";
    changed := false;

    old_id := meta #>> '{logisticsCadastros,supplierId}';
    IF old_id IS NOT NULL AND old_id <> '' THEN
      SELECT name INTO old_name FROM "LogisticsSupplier" WHERE id = old_id;
      IF old_name IS NOT NULL THEN
        SELECT s.id INTO new_id
        FROM "Supplier" s
        WHERE s."tenantId" = r."tenantId"
          AND lower(s.name) = lower(old_name)
        LIMIT 1;
        IF new_id IS NOT NULL THEN
          meta := jsonb_set(
            COALESCE(meta, '{}'::jsonb),
            '{logisticsCadastros,supplierId}',
            to_jsonb(new_id),
            true
          );
          changed := true;
        END IF;
      END IF;
    END IF;

    IF jsonb_typeof(meta -> 'expenseLines') = 'array' THEN
      lines := meta -> 'expenseLines';
      FOR i IN 0 .. COALESCE(jsonb_array_length(lines), 0) - 1 LOOP
        line := lines -> i;
        line_old := line ->> 'supplierId';
        IF line_old IS NOT NULL AND line_old <> '' THEN
          SELECT name INTO line_name FROM "LogisticsSupplier" WHERE id = line_old;
          IF line_name IS NOT NULL THEN
            SELECT s.id INTO line_new
            FROM "Supplier" s
            WHERE s."tenantId" = r."tenantId"
              AND lower(s.name) = lower(line_name)
            LIMIT 1;
            IF line_new IS NOT NULL THEN
              line := jsonb_set(line, '{supplierId}', to_jsonb(line_new), true);
              lines := jsonb_set(lines, ARRAY[i::text], line, true);
              changed := true;
            END IF;
          END IF;
        END IF;
      END LOOP;
      IF changed THEN
        meta := jsonb_set(COALESCE(meta, '{}'::jsonb), '{expenseLines}', lines, true);
      END IF;
    END IF;

    IF changed THEN
      UPDATE "TravelLogistics"
      SET "beatscodeMeta" = meta
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

DROP TABLE IF EXISTS "LogisticsSupplier";
DROP TABLE IF EXISTS "LogisticsSupplierCategory";
DROP TABLE IF EXISTS _club_tenants;
