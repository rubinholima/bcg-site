import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { MediaMetaService } from './media-meta.service';

const LEGACY_PREFIX = 'logos/external/';
const NEW_PREFIX = 'logos/clubes-adv/';
const FROM = 'logos/external/';
const TO = 'logos/clubes-adv/';

@Injectable()
export class ExternalLogosMigrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly mediaMeta: MediaMetaService,
  ) {}

  /**
   * Copia cada objeto de logos/external/ para logos/clubes-adv/, atualiza MediaMeta,
   * substitui URLs no banco (Próximos Jogos, páginas, cadastros) e remove o original.
   */
  async run(): Promise<{
    migratedFiles: number;
    dbRowsUpdated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    const keys = await this.s3.listKeysUnderPrefix(LEGACY_PREFIX);
    const succeededOldKeys: string[] = [];

    for (const oldKey of keys) {
      const basename = oldKey.slice(LEGACY_PREFIX.length);
      if (!basename) continue;
      const newKey = `${NEW_PREFIX}${basename}`;
      try {
        await this.s3.copyObject(oldKey, newKey);
        await this.mediaMeta.migrateMediaKey(oldKey, newKey);
        succeededOldKeys.push(oldKey);
      } catch (e) {
        errors.push(`${oldKey}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    let dbRowsUpdated = 0;
    try {
      dbRowsUpdated = await this.replaceUrlsInDatabase();
    } catch (e) {
      errors.push(
        `banco: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    for (const oldKey of succeededOldKeys) {
      try {
        await this.s3.deleteObject(oldKey);
      } catch (e) {
        errors.push(
          `apagar ${oldKey}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return {
      migratedFiles: succeededOldKeys.length,
      dbRowsUpdated,
      errors,
    };
  }

  private async replaceUrlsInDatabase(): Promise<number> {
    const like = `%${FROM}%`;
    let total = 0;

    const exec = async (q: Prisma.Sql) => {
      const r = await this.prisma.$executeRaw(q);
      return typeof r === 'number' ? r : 0;
    };

    total += await exec(
      Prisma.sql`UPDATE "VisitingTeam" SET "logoUrl" = REPLACE("logoUrl", ${FROM}, ${TO}) WHERE "logoUrl" LIKE ${like}`,
    );
    total += await exec(
      Prisma.sql`UPDATE "Championship" SET "logoUrl" = REPLACE("logoUrl", ${FROM}, ${TO}) WHERE "logoUrl" LIKE ${like}`,
    );
    total += await exec(
      Prisma.sql`UPDATE "Event" SET "logoUrl" = REPLACE("logoUrl", ${FROM}, ${TO}) WHERE "logoUrl" LIKE ${like}`,
    );
    total += await exec(
      Prisma.sql`UPDATE "Tenant" SET "logoUrl" = REPLACE("logoUrl", ${FROM}, ${TO}) WHERE "logoUrl" LIKE ${like}`,
    );
    total += await exec(
      Prisma.sql`UPDATE "Group" SET "logoUrl" = REPLACE("logoUrl", ${FROM}, ${TO}) WHERE "logoUrl" LIKE ${like}`,
    );

    total += await exec(
      Prisma.sql`UPDATE "Page" SET content = replace(content::text, ${FROM}, ${TO})::jsonb WHERE content::text LIKE ${like}`,
    );
    total += await exec(
      Prisma.sql`UPDATE "HomeContent" SET content = replace(content::text, ${FROM}, ${TO})::jsonb WHERE content::text LIKE ${like}`,
    );
    total += await exec(
      Prisma.sql`UPDATE "Event" SET content = replace(content::text, ${FROM}, ${TO})::jsonb WHERE content::text LIKE ${like}`,
    );
    total += await exec(
      Prisma.sql`UPDATE "Group" SET "homeContent" = replace("homeContent"::text, ${FROM}, ${TO})::jsonb WHERE "homeContent" IS NOT NULL AND "homeContent"::text LIKE ${like}`,
    );
    total += await exec(
      Prisma.sql`UPDATE "Group" SET "moduleDefaults" = replace("moduleDefaults"::text, ${FROM}, ${TO})::jsonb WHERE "moduleDefaults" IS NOT NULL AND "moduleDefaults"::text LIKE ${like}`,
    );

    return total;
  }
}
