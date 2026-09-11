import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class FootballActivitySpacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  async list(tenantId?: string) {
    return this.prisma.footballActivitySpace.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        active: true,
      },
      orderBy: [{ tenantId: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: { tenantId: string; name: string; address?: string; notes?: string }) {
    await this.ensureClubTenant(dto.tenantId);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Nome do espaço é obrigatório');

    const existing = await this.prisma.footballActivitySpace.findFirst({
      where: { tenantId: dto.tenantId, name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new BadRequestException(`Espaço "${name}" já existe neste clube.`);

    return this.prisma.footballActivitySpace.create({
      data: {
        tenantId: dto.tenantId,
        name,
        address: dto.address?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async update(
    id: string,
    dto: Partial<{ name: string; address: string; notes: string; active: boolean }>,
  ) {
    const row = await this.prisma.footballActivitySpace.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Espaço não encontrado');

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Nome do espaço é obrigatório');
      const dup = await this.prisma.footballActivitySpace.findFirst({
        where: {
          tenantId: row.tenantId,
          name: { equals: name, mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (dup) throw new BadRequestException(`Espaço "${name}" já existe neste clube.`);
    }

    return this.prisma.footballActivitySpace.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.address !== undefined && { address: dto.address.trim() || null }),
        ...(dto.notes !== undefined && { notes: dto.notes.trim() || null }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async delete(id: string) {
    const row = await this.prisma.footballActivitySpace.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Espaço não encontrado');
    await this.prisma.footballActivitySpace.update({
      where: { id },
      data: { active: false },
    });
    return { ok: true };
  }

  /** Resolve ou cria espaço pelo nome (import Beatscode / FMF / texto livre). */
  async resolveByName(tenantId: string, name: string | null | undefined): Promise<string | null> {
    const trimmed = name?.trim();
    if (!trimmed) return null;

    const existing = await this.findSpaceByTenantAndName(tenantId, trimmed);
    if (existing) return existing.id;

    try {
      const created = await this.prisma.footballActivitySpace.create({
        data: { tenantId, name: trimmed },
      });
      return created.id;
    } catch (error) {
      if (this.isTenantNameUniqueViolation(error)) {
        const raced = await this.findSpaceByTenantAndName(tenantId, trimmed);
        if (raced) return raced.id;
      }
      throw error;
    }
  }

  private findSpaceByTenantAndName(tenantId: string, name: string) {
    return this.prisma.footballActivitySpace.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' } },
    });
  }

  private isTenantNameUniqueViolation(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      return false;
    }
    const target = error.meta?.target;
    if (Array.isArray(target)) {
      return target.includes('tenantId') && target.includes('name');
    }
    return typeof target === 'string' && target.includes('tenantId') && target.includes('name');
  }

  /** Espaços padrão quando o clube ainda não tem nenhum cadastrado. */
  async ensureDefaults(tenantId: string): Promise<void> {
    const count = await this.prisma.footballActivitySpace.count({
      where: { tenantId, active: true },
    });
    if (count > 0) return;

    const defaults = [
      'Campo 1',
      'Campo 2',
      'Campo 3',
      'Academia',
      'Sala de reuniões',
      'Fisioterapia',
    ];
    for (const name of defaults) {
      const exists = await this.prisma.footballActivitySpace.findFirst({
        where: { tenantId, name: { equals: name, mode: 'insensitive' } },
      });
      if (!exists) {
        await this.prisma.footballActivitySpace.create({
          data: { tenantId, name },
        });
      }
    }
  }

  private async ensureClubTenant(tenantId: string) {
    const tenant = await this.tenants.findOne(tenantId);
    const kindName = (tenant as { kind?: { name?: string } }).kind?.name?.toLowerCase() ?? '';
    const isClub =
      kindName.includes('futebol') || kindName.includes('clube') || kindName.includes('football');
    if (
      !isClub ||
      kindName.includes('construtora') ||
      kindName.includes('real estate') ||
      kindName.includes('construção')
    ) {
      throw new BadRequestException('Espaços operacionais são apenas para clubes de futebol');
    }
  }
}
