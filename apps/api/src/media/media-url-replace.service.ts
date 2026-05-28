import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { MediaMetaService } from './media-meta.service';

/** Substitui referências de uma key S3 por outra no banco (URLs em colunas e JSON). */
@Injectable()
export class MediaUrlReplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly mediaMeta: MediaMetaService,
  ) {}

  async replaceMediaKeyInDatabase(fromKey: string, toKey: string): Promise<number> {
    const from = fromKey.replace(/^\/+/, '').trim();
    const to = toKey.replace(/^\/+/, '').trim();
    if (!from || !to || from === to) return 0;
    if (!from.startsWith('logos/') && !from.startsWith('media/')) return 0;
    if (!to.startsWith('logos/') && !to.startsWith('media/')) return 0;

    const fromUrl = this.s3.getPublicUrl(from);
    const toUrl = this.s3.getPublicUrl(to);
    let total = 0;

    const exec = async (q: Prisma.Sql) => {
      const r = await this.prisma.$executeRaw(q);
      total += typeof r === 'number' ? r : 0;
    };

    const likeKey = `%${from}%`;
    const likeUrl = `%${fromUrl}%`;

    const scalarColumns: Array<{ table: string; column: string }> = [
      { table: 'Group', column: 'logoUrl' },
      { table: 'Tenant', column: 'logoUrl' },
      { table: 'Event', column: 'logoUrl' },
      { table: 'Championship', column: 'logoUrl' },
      { table: 'VisitingTeam', column: 'logoUrl' },
      { table: 'Player', column: 'photoUrl' },
      { table: 'MedicalStaff', column: 'photoUrl' },
      { table: 'Psychologist', column: 'photoUrl' },
      { table: 'TechnicalStaff', column: 'photoUrl' },
      { table: 'Employee', column: 'photoUrl' },
      { table: 'Employee', column: 'ctpsUrl' },
      { table: 'Employee', column: 'admissionMedicalExamFileUrl' },
      { table: 'Employee', column: 'dismissalMedicalExamFileUrl' },
      { table: 'Asset', column: 'photoUrl' },
      { table: 'EmployeeDependent', column: 'birthCertificateFileUrl' },
      { table: 'EmployeeDependent', column: 'schoolAttendanceFileUrl' },
      { table: 'EmployeeDependent', column: 'vaccinationCardFileUrl' },
      { table: 'EmployeeDocument', column: 'fileUrl' },
      { table: 'EmploymentContract', column: 'fileUrl' },
      { table: 'EmploymentContract', column: 'signedFileUrl' },
    ];

    for (const { table, column } of scalarColumns) {
      await exec(
        Prisma.sql`UPDATE ${Prisma.raw(`"${table}"`)} SET ${Prisma.raw(`"${column}"`)} = REPLACE(${Prisma.raw(`"${column}"`)}, ${from}, ${to}) WHERE ${Prisma.raw(`"${column}"`)} LIKE ${likeKey}`,
      );
      if (fromUrl !== from) {
        await exec(
          Prisma.sql`UPDATE ${Prisma.raw(`"${table}"`)} SET ${Prisma.raw(`"${column}"`)} = REPLACE(${Prisma.raw(`"${column}"`)}, ${fromUrl}, ${toUrl}) WHERE ${Prisma.raw(`"${column}"`)} LIKE ${likeUrl}`,
        );
      }
    }

    await exec(
      Prisma.sql`UPDATE "EventPhoto" SET "s3Key" = ${to} WHERE "s3Key" = ${from}`,
    );

    const jsonTables: Array<{ table: string; column: string }> = [
      { table: 'Page', column: 'content' },
      { table: 'HomeContent', column: 'content' },
      { table: 'Event', column: 'content' },
      { table: 'Group', column: 'homeContent' },
      { table: 'Group', column: 'moduleDefaults' },
      { table: 'Player', column: 'images' },
      { table: 'MarketingPost', column: 'imageUrls' },
    ];

    for (const { table, column } of jsonTables) {
      await exec(
        Prisma.sql`UPDATE ${Prisma.raw(`"${table}"`)} SET ${Prisma.raw(`"${column}"`)} = replace(${Prisma.raw(`"${column}"`)}::text, ${from}, ${to})::jsonb WHERE ${Prisma.raw(`"${column}"`)}::text LIKE ${likeKey}`,
      );
      if (fromUrl !== from) {
        await exec(
          Prisma.sql`UPDATE ${Prisma.raw(`"${table}"`)} SET ${Prisma.raw(`"${column}"`)} = replace(${Prisma.raw(`"${column}"`)}::text, ${fromUrl}, ${toUrl})::jsonb WHERE ${Prisma.raw(`"${column}"`)}::text LIKE ${likeUrl}`,
        );
      }
    }

    try {
      await this.mediaMeta.migrateMediaKey(from, to);
    } catch {
      /* meta opcional */
    }

    return total;
  }
}
