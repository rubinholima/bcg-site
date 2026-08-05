ALTER TABLE "TechnicalStaff" ADD COLUMN "jobRoleId" TEXT;

CREATE INDEX "TechnicalStaff_jobRoleId_idx" ON "TechnicalStaff"("jobRoleId");

ALTER TABLE "TechnicalStaff"
ADD CONSTRAINT "TechnicalStaff_jobRoleId_fkey"
FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

WITH normalized_staff_roles AS (
  SELECT DISTINCT
    "tenantId",
    UPPER(
      TRIM(
        REGEXP_REPLACE(
          REPLACE("role", '_', ' '),
          '\s*-\s*',
          ' ',
          'g'
        )
      )
    ) AS "name"
  FROM "TechnicalStaff"
  WHERE TRIM(COALESCE("role", '')) <> ''
)
INSERT INTO "JobRole" ("id", "tenantId", "name", "type", "createdAt", "updatedAt")
SELECT
  'jr_staff_' || MD5(n."tenantId" || ':' || n."name"),
  n."tenantId",
  n."name",
  'staff',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM normalized_staff_roles n
WHERE n."name" <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "JobRole" j
    WHERE j."tenantId" = n."tenantId"
      AND j."type" = 'staff'
      AND UPPER(
        TRIM(
          REGEXP_REPLACE(
            REPLACE(j."name", '_', ' '),
            '\s*-\s*',
            ' ',
            'g'
          )
        )
      ) = n."name"
  );

UPDATE "TechnicalStaff" s
SET
  "jobRoleId" = j."id",
  "role" = j."name"
FROM "JobRole" j
WHERE j."tenantId" = s."tenantId"
  AND j."type" = 'staff'
  AND UPPER(
    TRIM(
      REGEXP_REPLACE(
        REPLACE(j."name", '_', ' '),
        '\s*-\s*',
        ' ',
        'g'
      )
    )
  ) = UPPER(
    TRIM(
      REGEXP_REPLACE(
        REPLACE(s."role", '_', ' '),
        '\s*-\s*',
        ' ',
        'g'
      )
    )
  );
