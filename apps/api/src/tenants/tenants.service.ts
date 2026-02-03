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
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(row: TenantRow): TenantResponseDto {
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
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<TenantResponseDto[]> {
    try {
      const tenants = await this.prisma.$queryRaw<TenantRow[]>`
        SELECT t.id, t.name, t.slug, t."kindId", k.name as "kindName", t."logoUrl",
          t.location, t.address, t."contactName", t."contactPhone", t."createdAt", t."updatedAt"
        FROM "Tenant" t
        LEFT JOIN "TenantKind" k ON k.id = t."kindId"
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
          t.location, t.address, t."contactName", t."contactPhone", t."createdAt", t."updatedAt"
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
      await this.prisma.$executeRaw`
        INSERT INTO "Tenant" (id, name, slug, "kindId", location, address, "contactName", "contactPhone", "createdAt", "updatedAt")
        VALUES (${id}, ${dto.name}, ${dto.slug}, ${dto.kindId}, ${dto.location ?? null}, ${dto.address ?? null}, ${dto.contactName ?? null}, ${dto.contactPhone ?? null}, ${now}, ${now})
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
      if (dto.location !== undefined) {
        updates.push(`location = $${++idx}`);
        values.push(dto.location);
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
