import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantResponseDto } from './dto/tenant-response.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  kindId: string | null;
  kindName: string | null;
  logoUrl: string | null;
  location: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  country: string | null;
  websiteUrl: string | null;
  sofascoreTeamId: string | null;
  footballDataTeamId: string | null;
  apiFutebolTeamId: string | null;
  categories: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(row: TenantRow): TenantResponseDto {
  let categories: string[] | null;
  if (Array.isArray(row.categories)) {
    categories = row.categories as string[];
  } else if (row.categories != null && typeof row.categories === 'object') {
    categories = JSON.parse(JSON.stringify(row.categories)) as string[];
  } else {
    categories = null;
  }
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    location: row.location ?? null,
    address: row.address ?? null,
    contactName: row.contactName ?? null,
    contactPhone: row.contactPhone ?? null,
    kindId: row.kindId ?? '',
    kind: { id: row.kindId ?? '', name: row.kindName ?? '' },
    logoUrl: row.logoUrl ?? null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    city: row.city ?? null,
    country: row.country ?? null,
    websiteUrl: row.websiteUrl ?? null,
    sofascoreTeamId: row.sofascoreTeamId ?? null,
    footballDataTeamId: row.footballDataTeamId ?? null,
    apiFutebolTeamId: row.apiFutebolTeamId ?? null,
    categories,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Slug do Grupo Master — não é empresa; nunca listar na lista de tenants. */
  private static readonly GROUP_MASTER_SLUG = 'bcg';

  async findAll(): Promise<TenantResponseDto[]> {
    try {
      const tenants = await this.prisma.$queryRaw<TenantRow[]>`
        SELECT t.id, t.name, t.slug, t."kindId", k.name as "kindName", t."logoUrl",
          t.location, t.address, t."contactName", t."contactPhone",
          t.lat, t.lng, t.city, t.country, t."websiteUrl", t."sofascoreTeamId", t."footballDataTeamId", t."apiFutebolTeamId", t.categories,
          t."createdAt", t."updatedAt"
        FROM "Tenant" t
        LEFT JOIN "TenantKind" k ON k.id = t."kindId"
        WHERE t.slug != ${TenantsService.GROUP_MASTER_SLUG}
        ORDER BY t.name ASC
      `;
      return tenants.map(mapRow);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `TenantsService.findAll failed: ${message}`,
      );
    }
  }

  async findOne(id: string): Promise<TenantResponseDto> {
    try {
      const rows = await this.prisma.$queryRaw<TenantRow[]>`
        SELECT t.id, t.name, t.slug, t."kindId", k.name as "kindName", t."logoUrl",
          t.location, t.address, t."contactName", t."contactPhone",
          t.lat, t.lng, t.city, t.country, t."websiteUrl", t."sofascoreTeamId", t."footballDataTeamId", t."apiFutebolTeamId", t.categories,
          t."createdAt", t."updatedAt"
        FROM "Tenant" t
        LEFT JOIN "TenantKind" k ON k.id = t."kindId"
        WHERE t.id = ${id}
      `;
      const row = rows[0];
      if (!row) {
        throw new NotFoundException(`Empresa com ID "${id}" não encontrada`);
      }
      return mapRow(row);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `TenantsService.findOne failed: ${message}`,
      );
    }
  }

  async create(dto: CreateTenantDto): Promise<TenantResponseDto> {
    try {
      const id = crypto.randomUUID();
      const now = new Date();
      const categoriesJson =
        dto.categories && Array.isArray(dto.categories) && dto.categories.length > 0
          ? JSON.stringify(dto.categories)
          : null;
      await this.prisma.$executeRaw`
        INSERT INTO "Tenant" (id, name, slug, "kindId", address, "contactName", "contactPhone", lat, lng, city, country, "websiteUrl", "sofascoreTeamId", categories, "createdAt", "updatedAt")
        VALUES (${id}, ${dto.name}, ${dto.slug}, ${dto.kindId}, ${dto.address ?? null}, ${dto.contactName ?? null}, ${dto.contactPhone ?? null}, ${dto.lat ?? null}, ${dto.lng ?? null}, ${dto.city ?? null}, ${dto.country ?? null}, ${dto.websiteUrl ?? null}, ${(dto.sofascoreTeamId ?? "").trim() || null}, ${categoriesJson}::jsonb, ${now}, ${now})
      `;
      return this.findOne(id);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('unique') || message.includes('duplicate')) {
        throw new ConflictException('Já existe uma empresa com este slug.');
      }
      throw new InternalServerErrorException(
        `TenantsService.create failed: ${message}`,
      );
    }
  }

  async update(id: string, dto: UpdateTenantDto): Promise<TenantResponseDto> {
    await this.findOne(id);
    try {
      const now = new Date();
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 0;
      if (dto.name !== undefined) {
        updates.push(`name = $${++idx}`);
        values.push(dto.name);
      }
      if (dto.slug !== undefined) {
        updates.push(`slug = $${++idx}`);
        values.push(dto.slug);
      }
      if (dto.kindId !== undefined) {
        updates.push(`"kindId" = $${++idx}`);
        values.push(dto.kindId);
      }
      if (dto.logoUrl !== undefined) {
        updates.push(`"logoUrl" = $${++idx}`);
        values.push(dto.logoUrl);
      }
      if (dto.address !== undefined) {
        updates.push(`address = $${++idx}`);
        values.push(dto.address);
      }
      if (dto.contactName !== undefined) {
        updates.push(`"contactName" = $${++idx}`);
        values.push(dto.contactName);
      }
      if (dto.contactPhone !== undefined) {
        updates.push(`"contactPhone" = $${++idx}`);
        values.push(dto.contactPhone);
      }
      if (dto.lat !== undefined) {
        updates.push(`lat = $${++idx}`);
        values.push(dto.lat);
      }
      if (dto.lng !== undefined) {
        updates.push(`lng = $${++idx}`);
        values.push(dto.lng);
      }
      if (dto.city !== undefined) {
        updates.push(`city = $${++idx}`);
        values.push(dto.city);
      }
      if (dto.country !== undefined) {
        updates.push(`country = $${++idx}`);
        values.push(dto.country);
      }
      if (dto.websiteUrl !== undefined) {
        updates.push(`"websiteUrl" = $${++idx}`);
        values.push(dto.websiteUrl);
      }
      if (dto.sofascoreTeamId !== undefined) {
        updates.push(`"sofascoreTeamId" = $${++idx}`);
        values.push(dto.sofascoreTeamId);
      }
      if (dto.footballDataTeamId !== undefined) {
        updates.push(`"footballDataTeamId" = $${++idx}`);
        values.push(dto.footballDataTeamId);
      }
      if (dto.apiFutebolTeamId !== undefined) {
        updates.push(`"apiFutebolTeamId" = $${++idx}`);
        values.push(dto.apiFutebolTeamId);
      }
      if (dto.categories !== undefined) {
        updates.push(`categories = $${++idx}::jsonb`);
        values.push(
          dto.categories === null || (Array.isArray(dto.categories) && dto.categories.length === 0)
            ? null
            : JSON.stringify(Array.isArray(dto.categories) ? dto.categories : []),
        );
      }
      if (updates.length === 0) return this.findOne(id);
      updates.push(`"updatedAt" = $${++idx}`);
      values.push(now);
      const whereIdx = idx + 1;
      values.push(id);
      await this.prisma.$executeRawUnsafe(
        `UPDATE "Tenant" SET ${updates.join(', ')} WHERE id = $${whereIdx}`,
        ...values,
      );
      return this.findOne(id);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('unique') || message.includes('duplicate')) {
        throw new ConflictException('Já existe uma empresa com este slug.');
      }
      throw new InternalServerErrorException(
        `TenantsService.update failed: ${message}`,
      );
    }
  }

  async updateLogoUrl(tenantId: string, logoUrl: string): Promise<TenantResponseDto> {
    return this.update(tenantId, { logoUrl });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    try {
      await this.prisma.$executeRaw`DELETE FROM "Tenant" WHERE id = ${id}`;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `TenantsService.remove failed: ${message}`,
      );
    }
  }
}
