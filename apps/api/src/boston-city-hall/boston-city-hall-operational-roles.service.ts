import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallBarService } from './boston-city-hall-bar.service';
import {
  BCH_DEFAULT_OPERATIONAL_ROLES,
  type BchOperationalRoleDto,
} from './boston-city-hall-operational-roles.constants';

@Injectable()
export class BostonCityHallOperationalRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bar: BostonCityHallBarService,
  ) {}

  private async tenantId(): Promise<string> {
    return this.bar.resolveBchTenantId();
  }

  async ensureDefaults(tenantId: string) {
    const count = await this.prisma.bchOperationalRole.count({ where: { tenantId } });
    if (count > 0) return;
    await this.prisma.bchOperationalRole.createMany({
      data: BCH_DEFAULT_OPERATIONAL_ROLES.map((r) => ({
        tenantId,
        code: r.code,
        name: r.name,
        sortOrder: r.sortOrder,
        active: true,
      })),
    });
  }

  private toDto(row: {
    id: string;
    code: string;
    name: string;
    active: boolean;
    sortOrder: number;
  }): BchOperationalRoleDto {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      active: row.active,
      sortOrder: row.sortOrder,
    };
  }

  async list(activeOnly = true): Promise<BchOperationalRoleDto[]> {
    const tenantId = await this.tenantId();
    await this.ensureDefaults(tenantId);
    const rows = await this.prisma.bchOperationalRole.findMany({
      where: { tenantId, ...(activeOnly ? { active: true } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((r) => this.toDto(r));
  }

  async listAllForAdmin(): Promise<BchOperationalRoleDto[]> {
    return this.list(false);
  }

  async create(body: { code: string; name: string; sortOrder?: number; active?: boolean }) {
    const tenantId = await this.tenantId();
    const code = body.code.trim().toLowerCase().replace(/\s+/g, '_');
    const name = body.name.trim();
    if (!code || !name) throw new BadRequestException('Código e nome são obrigatórios.');
    return this.prisma.bchOperationalRole.create({
      data: {
        tenantId,
        code,
        name,
        sortOrder: body.sortOrder ?? 100,
        active: body.active ?? true,
      },
    });
  }

  async update(id: string, body: Partial<{ name: string; sortOrder: number; active: boolean }>) {
    const tenantId = await this.tenantId();
    const row = await this.prisma.bchOperationalRole.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Função não encontrada.');
    return this.prisma.bchOperationalRole.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });
  }

  async resolveRoleLabel(tenantId: string, operationalRoleId: string | null | undefined, fallback: string) {
    if (!operationalRoleId?.trim()) return fallback.trim();
    const role = await this.prisma.bchOperationalRole.findFirst({
      where: { id: operationalRoleId.trim(), tenantId },
      select: { name: true, active: true },
    });
    if (role?.name) return role.name;
    return fallback.trim();
  }
}
