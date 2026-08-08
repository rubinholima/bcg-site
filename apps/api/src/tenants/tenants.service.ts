import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { VaultEncryptionService } from '../vault/vault-encryption.service';
import { TenantResponseDto } from './dto/tenant-response.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

const tenantListInclude = {
  kind: { select: { id: true, name: true } },
} satisfies Prisma.TenantInclude;

type TenantWithKind = Prisma.TenantGetPayload<{ include: typeof tenantListInclude }>;

/** Slugs de categoria (sub14, principal…) — enum técnico; não aplicar MAIÚSCULAS de cadastro. */
function normalizeTenantCategorySlugs(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  const out = value
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return out.length ? out : null;
}

function categoriesToJsonbParam(value: string[] | null | undefined): string | null {
  const normalized = normalizeTenantCategorySlugs(value ?? null);
  return normalized ? JSON.stringify(normalized) : null;
}

function mapTenant(row: TenantWithKind): TenantResponseDto {
  const categories = normalizeTenantCategorySlugs(row.categories);
  return {
    id: row.id,
    name: row.name,
    tradeName: row.tradeName ?? null,
    slug: row.slug,
    location: row.location ?? null,
    address: row.address ?? null,
    contactName: row.contactName ?? null,
    contactPhone: row.contactPhone ?? null,
    kindId: row.kindId,
    kind: { id: row.kind.id, name: row.kind.name },
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
    omieIntegrationConfigured: !!(row.omieAppKeyEnc && row.omieAppSecretEnc),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: VaultEncryptionService,
  ) {}

  /** Slug do Grupo Master — não é empresa; nunca listar na lista de tenants. */
  private static readonly GROUP_MASTER_SLUG = 'bcg';

  /** Considera "clube" se o tipo contiver futebol/clube/football. */
  private static isClubKind(kindName: string | null): boolean {
    if (!kindName) return false;
    const k = kindName.toLowerCase();
    return k.includes('futebol') || k.includes('clube') || k.includes('football');
  }

  async findAll(
    clubsOnly = false,
    allowedTenantIds: string[] | null = null,
  ): Promise<TenantResponseDto[]> {
    try {
      const where: Prisma.TenantWhereInput = {
        slug: { not: TenantsService.GROUP_MASTER_SLUG },
        ...(allowedTenantIds !== null ? { id: { in: allowedTenantIds } } : {}),
      };
      const tenants = await this.prisma.tenant.findMany({
        where,
        include: tenantListInclude,
        orderBy: { name: 'asc' },
      });
      const filtered = clubsOnly
        ? tenants.filter((row) => TenantsService.isClubKind(row.kind.name))
        : tenants;
      return filtered.map(mapTenant);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `TenantsService.findAll failed: ${message}`,
      );
    }
  }

  async findOne(id: string, allowedTenantIds: string[] | null = null): Promise<TenantResponseDto> {
    try {
      const row = await this.prisma.tenant.findUnique({
        where: { id },
        include: tenantListInclude,
      });
      if (!row) {
        throw new NotFoundException(`Empresa com ID "${id}" não encontrada`);
      }
      if (allowedTenantIds !== null && !allowedTenantIds.includes(row.id)) {
        throw new NotFoundException(`Empresa com ID "${id}" não encontrada`);
      }
      return mapTenant(row);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `TenantsService.findOne failed: ${message}`,
      );
    }
  }

  async create(dto: CreateTenantDto, allowedTenantIds: string[] | null = null): Promise<TenantResponseDto> {
    if (allowedTenantIds !== null) {
      throw new ForbiddenException(
        'Usuário com escopo por empresa não pode criar novas empresas. Peça a um super admin.',
      );
    }
    try {
      const id = crypto.randomUUID();
      const now = new Date();
      const categoriesJson = categoriesToJsonbParam(dto.categories ?? null);
      await this.prisma.$executeRaw`
        INSERT INTO "Tenant" (id, name, "tradeName", slug, "kindId", address, "contactName", "contactPhone", lat, lng, city, country, "websiteUrl", "sofascoreTeamId", categories, "createdAt", "updatedAt")
        VALUES (${id}, ${cadastroUpperRequired(dto.name)}, ${dto.tradeName?.trim() || null}, ${dto.slug}, ${dto.kindId}, ${cadastroUpper(dto.address)}, ${cadastroUpper(dto.contactName)}, ${cadastroUpper(dto.contactPhone)}, ${dto.lat ?? null}, ${dto.lng ?? null}, ${cadastroUpper(dto.city)}, ${cadastroUpper(dto.country)}, ${dto.websiteUrl?.trim() || null}, ${(dto.sofascoreTeamId ?? "").trim() || null}, ${categoriesJson}::jsonb, ${now}, ${now})
      `;
      return this.findOne(id, allowedTenantIds);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if (err instanceof ForbiddenException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('unique') || message.includes('duplicate')) {
        throw new ConflictException('Já existe uma empresa com este slug.');
      }
      throw new InternalServerErrorException(
        `TenantsService.create failed: ${message}`,
      );
    }
  }

  async update(
    id: string,
    dto: UpdateTenantDto,
    allowedTenantIds: string[] | null = null,
  ): Promise<TenantResponseDto> {
    await this.findOne(id, allowedTenantIds);
    try {
      const now = new Date();
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 0;
      if (dto.name !== undefined) {
        updates.push(`name = $${++idx}`);
        values.push(cadastroUpperRequired(dto.name));
      }
      if (dto.tradeName !== undefined) {
        updates.push(`"tradeName" = $${++idx}`);
        values.push(dto.tradeName?.trim() || null);
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
        values.push(cadastroUpper(dto.address));
      }
      if (dto.contactName !== undefined) {
        updates.push(`"contactName" = $${++idx}`);
        values.push(cadastroUpper(dto.contactName));
      }
      if (dto.contactPhone !== undefined) {
        updates.push(`"contactPhone" = $${++idx}`);
        values.push(cadastroUpper(dto.contactPhone));
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
        values.push(cadastroUpper(dto.city));
      }
      if (dto.country !== undefined) {
        updates.push(`country = $${++idx}`);
        values.push(cadastroUpper(dto.country));
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
        values.push(categoriesToJsonbParam(dto.categories));
      }

      const hasOmieChange =
        dto.omieCredentialsClear === true ||
        !!(dto.omieAppKey && String(dto.omieAppKey).trim()) ||
        !!(dto.omieAppSecret && String(dto.omieAppSecret).trim());

      if (updates.length === 0 && !hasOmieChange) {
        return this.findOne(id, allowedTenantIds);
      }
      if (updates.length > 0) {
        updates.push(`"updatedAt" = $${++idx}`);
        values.push(now);
        const whereIdx = idx + 1;
        values.push(id);
        await this.prisma.$executeRawUnsafe(
          `UPDATE "Tenant" SET ${updates.join(', ')} WHERE id = $${whereIdx}`,
          ...values,
        );
      }

      await this.persistOmieCredentials(id, dto);
      return this.findOne(id, allowedTenantIds);
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

  async updateLogoUrl(
    tenantId: string,
    logoUrl: string,
    allowedTenantIds: string[] | null = null,
  ): Promise<TenantResponseDto> {
    return this.update(tenantId, { logoUrl }, allowedTenantIds);
  }

  private async persistOmieCredentials(id: string, dto: UpdateTenantDto): Promise<void> {
    if (dto.omieCredentialsClear === true) {
      await this.prisma.tenant.update({
        where: { id },
        data: {
          omieAppKeyEnc: null,
          omieAppKeyIv: null,
          omieAppSecretEnc: null,
          omieAppSecretIv: null,
        },
      });
      return;
    }
    const key = dto.omieAppKey?.trim();
    const secret = dto.omieAppSecret?.trim();
    if (!key && !secret) return;
    if (!key || !secret) {
      throw new BadRequestException(
        'Informe App Key e App Secret do Omie juntos para gravar a integração.',
      );
    }
    try {
      const ek = this.encryption.encrypt(key);
      const es = this.encryption.encrypt(secret);
      await this.prisma.tenant.update({
        where: { id },
        data: {
          omieAppKeyEnc: ek.encrypted,
          omieAppKeyIv: ek.iv,
          omieAppSecretEnc: es.encrypted,
          omieAppSecretIv: es.iv,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('VAULT_MASTER_KEY')) {
        throw new InternalServerErrorException(
          'VAULT_MASTER_KEY não configurada no servidor — necessária para criptografar credenciais Omie.',
        );
      }
      throw err;
    }
  }

  /**
   * Credenciais Omie em texto claro para chamadas à API (uso interno — ex.: OmieService).
   */
  async getDecryptedOmieCredentials(
    tenantId: string,
  ): Promise<{ appKey: string; appSecret: string } | null> {
    const row = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        omieAppKeyEnc: true,
        omieAppKeyIv: true,
        omieAppSecretEnc: true,
        omieAppSecretIv: true,
      },
    });
    if (
      !row?.omieAppKeyEnc ||
      !row?.omieAppKeyIv ||
      !row?.omieAppSecretEnc ||
      !row?.omieAppSecretIv
    ) {
      return null;
    }
    try {
      return {
        appKey: this.encryption.decrypt(row.omieAppKeyEnc, row.omieAppKeyIv),
        appSecret: this.encryption.decrypt(row.omieAppSecretEnc, row.omieAppSecretIv),
      };
    } catch {
      return null;
    }
  }

  async remove(id: string, allowedTenantIds: string[] | null = null): Promise<void> {
    await this.findOne(id, allowedTenantIds);
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
