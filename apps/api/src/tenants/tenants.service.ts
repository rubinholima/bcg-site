import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantResponseDto } from './dto/tenant-response.dto';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  kindId: string | null;
  kindName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<TenantResponseDto[]> {
    try {
      const tenants = await this.prisma.$queryRaw<TenantRow[]>`
        SELECT t.id, t.name, t.slug, t."kindId", k.name as "kindName", t."createdAt", t."updatedAt"
        FROM "Tenant" t
        LEFT JOIN "TenantKind" k ON k.id = t."kindId"
        ORDER BY t.name ASC
      `;
      return tenants.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        location: null,
        kindId: row.kindId ?? '',
        kind: { id: row.kindId ?? '', name: row.kindName ?? '' },
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `TenantsService.findAll failed: ${message}`,
      );
    }
  }
}
