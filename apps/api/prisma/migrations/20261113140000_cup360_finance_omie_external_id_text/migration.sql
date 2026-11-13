-- PROMPT 069: IDs externos Omie como TEXT (evita overflow INT4)

ALTER TABLE "FinanceOmieMirrorRecord"
  ALTER COLUMN "omieLancamentoId" TYPE TEXT USING (
    CASE WHEN "omieLancamentoId" IS NULL THEN NULL ELSE "omieLancamentoId"::text END
  ),
  ALTER COLUMN "supplierOmieId" TYPE TEXT USING (
    CASE WHEN "supplierOmieId" IS NULL THEN NULL ELSE "supplierOmieId"::text END
  ),
  ALTER COLUMN "customerOmieId" TYPE TEXT USING (
    CASE WHEN "customerOmieId" IS NULL THEN NULL ELSE "customerOmieId"::text END
  );
