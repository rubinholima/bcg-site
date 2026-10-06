import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantAccessService } from '../auth/tenant-access.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLogisticsUniformKitDto,
  UpdateLogisticsUniformKitDto,
  LogisticsUniformKitItemInputDto,
} from './dto/create-logistics-uniform-kit.dto';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';

export type UniformKitActor = {
  sub: string;
  role: string;
};

@Injectable()
export class LogisticsUniformKitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private uniformKitInclude() {
    return {
      uniformType: { select: { id: true, name: true } },
      tenant: { select: { id: true, name: true } },
      items: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          clothingItem: {
            include: {
              category: { select: { id: true, name: true } },
              group: { select: { id: true, name: true } },
            },
          },
        },
      },
    };
  }

  private async allowedTenantIds(actor: UniformKitActor): Promise<string[] | null> {
    return this.tenantAccess.getAllowedTenantIds(actor.sub, actor.role);
  }

  private assertCanAccessTenant(
    allowed: string[] | null,
    tenantId: string,
  ): void {
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
  }

  private assertCanMutateKit(
    allowed: string[] | null,
    kit: { tenantId: string | null; isSystem: boolean },
  ): void {
    if (kit.isSystem) {
      throw new ForbiddenException('Kit de sistema não pode ser alterado — crie um kit do clube.');
    }
    if (kit.tenantId == null) {
      if (allowed !== null) {
        throw new ForbiddenException('Kit global só pode ser alterado pelo super admin.');
      }
      return;
    }
    this.assertCanAccessTenant(allowed, kit.tenantId);
  }

  private async validateTeamCategory(tenantId: string, teamCategory?: string | null) {
    const key = teamCategory?.trim();
    if (!key) return null;
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { categories: true },
    });
    if (!tenant) throw new BadRequestException('Empresa não encontrada.');
    const cats = Array.isArray(tenant.categories)
      ? (tenant.categories as unknown[]).filter((c): c is string => typeof c === 'string')
      : [];
    if (cats.length > 0 && !cats.includes(key)) {
      throw new BadRequestException('Categoria informada não pertence ao clube.');
    }
    return key;
  }

  private async validateKitItems(items?: LogisticsUniformKitItemInputDto[]) {
    if (!items?.length) return;
    const ids = items.map((i) => i.clothingItemId);
    const found = await this.prisma.logisticsClothingItem.count({
      where: { id: { in: ids } },
    });
    if (found !== new Set(ids).size) {
      throw new BadRequestException('Uma ou mais peças informadas não existem');
    }
  }

  private async findUniformType(id: string) {
    const t = await this.prisma.logisticsUniformType.findUnique({ where: { id } });
    if (!t) throw new BadRequestException('Tipo de uniforme não encontrado');
    return t;
  }

  private buildListWhere(
    allowed: string[] | null,
    opts: {
      activeOnly?: string;
      search?: string;
      uniformTypeId?: string;
      tenantId?: string;
    },
  ): Prisma.LogisticsUniformKitWhereInput {
    const and: Prisma.LogisticsUniformKitWhereInput[] = [];
    if (opts.activeOnly === 'true') and.push({ active: true });
    if (opts.uniformTypeId?.trim()) and.push({ uniformTypeId: opts.uniformTypeId.trim() });
    if (opts.search?.trim()) {
      and.push({ name: { contains: opts.search.trim(), mode: 'insensitive' } });
    }

    const tenantId = opts.tenantId?.trim();
    if (tenantId) {
      and.push({
        OR: [{ tenantId: null }, { tenantId }],
      });
    } else if (allowed !== null) {
      if (allowed.length === 0) {
        and.push({ id: '__none__' });
      } else {
        and.push({
          OR: [{ tenantId: null }, { tenantId: { in: allowed } }],
        });
      }
    }

    return and.length ? { AND: and } : {};
  }

  async findUniformKits(
    actor: UniformKitActor,
    activeOnly?: string,
    search?: string,
    uniformTypeId?: string,
    tenantId?: string,
  ) {
    const allowed = await this.allowedTenantIds(actor);
    const tid = tenantId?.trim();
    if (tid) {
      this.assertCanAccessTenant(allowed, tid);
    }
    return this.prisma.logisticsUniformKit.findMany({
      where: this.buildListWhere(allowed, {
        activeOnly,
        search,
        uniformTypeId,
        tenantId: tid,
      }),
      include: this.uniformKitInclude(),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findUniformKit(actor: UniformKitActor, id: string) {
    const item = await this.prisma.logisticsUniformKit.findUnique({
      where: { id },
      include: this.uniformKitInclude(),
    });
    if (!item) throw new NotFoundException('Kit de uniforme não encontrado');
    if (item.tenantId) {
      const allowed = await this.allowedTenantIds(actor);
      this.assertCanAccessTenant(allowed, item.tenantId);
    } else if (actor.role !== 'super_admin') {
      const allowed = await this.allowedTenantIds(actor);
      if (allowed !== null) {
        // legado/global: leitura ok; gestão bloqueada em assertCanMutateKit
      }
    }
    return item;
  }

  private resolveCreateTenantId(
    actor: UniformKitActor,
    allowed: string[] | null,
    dtoTenantId?: string | null,
  ): string | null {
    const requested = dtoTenantId?.trim() || null;
    if (actor.role === 'super_admin') {
      return requested;
    }
    if (actor.role === 'company_admin') {
      if (!requested) {
        throw new BadRequestException('Selecione o clube para cadastrar o uniforme.');
      }
      this.assertCanAccessTenant(allowed, requested);
      return requested;
    }
    if (!requested) {
      throw new BadRequestException('tenantId é obrigatório.');
    }
    this.assertCanAccessTenant(allowed, requested);
    return requested;
  }

  async createUniformKit(actor: UniformKitActor, dto: CreateLogisticsUniformKitDto) {
    const allowed = await this.allowedTenantIds(actor);
    const tenantId = this.resolveCreateTenantId(actor, allowed, dto.tenantId);
    const name = cadastroUpperRequired(dto.name);
    if (dto.uniformTypeId) await this.findUniformType(dto.uniformTypeId);
    await this.validateKitItems(dto.items);
    let teamCategory: string | null = null;
    if (tenantId && dto.teamCategory !== undefined) {
      teamCategory = await this.validateTeamCategory(tenantId, dto.teamCategory);
    }

    return this.prisma.logisticsUniformKit.create({
      data: {
        tenantId,
        teamCategory,
        name,
        uniformTypeId: dto.uniformTypeId ?? null,
        season: cadastroUpper(dto.season),
        imageUrl: dto.imageUrl?.trim() || null,
        description: cadastroUpper(dto.description),
        beatscodeId: dto.beatscodeId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
        isSystem: false,
        items: dto.items?.length
          ? {
              create: dto.items.map((i, idx) => ({
                clothingItemId: i.clothingItemId,
                sortOrder: i.sortOrder ?? idx,
              })),
            }
          : undefined,
      },
      include: this.uniformKitInclude(),
    });
  }

  async updateUniformKit(
    actor: UniformKitActor,
    id: string,
    dto: UpdateLogisticsUniformKitDto,
  ) {
    const current = await this.findUniformKit(actor, id);
    const allowed = await this.allowedTenantIds(actor);
    this.assertCanMutateKit(allowed, current);

    if (dto.tenantId !== undefined && dto.tenantId !== current.tenantId) {
      throw new ForbiddenException('Não é permitido mover kit entre empresas.');
    }

    if (dto.uniformTypeId) await this.findUniformType(dto.uniformTypeId);
    await this.validateKitItems(dto.items);

    let teamCategory: string | null | undefined = undefined;
    if (dto.teamCategory !== undefined && current.tenantId) {
      teamCategory = await this.validateTeamCategory(current.tenantId, dto.teamCategory);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.items !== undefined) {
        await tx.logisticsUniformKitItem.deleteMany({ where: { kitId: id } });
        if (dto.items.length) {
          await tx.logisticsUniformKitItem.createMany({
            data: dto.items.map((i, idx) => ({
              kitId: id,
              clothingItemId: i.clothingItemId,
              sortOrder: i.sortOrder ?? idx,
            })),
          });
        }
      }
      return tx.logisticsUniformKit.update({
        where: { id },
        data: {
          ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
          ...(dto.uniformTypeId !== undefined && {
            uniformTypeId: dto.uniformTypeId || null,
          }),
          ...(dto.season !== undefined && {
            season: cadastroUpper(dto.season),
          }),
          ...(dto.imageUrl !== undefined && {
            imageUrl: dto.imageUrl?.trim() || null,
          }),
          ...(dto.description !== undefined && {
            description: cadastroUpper(dto.description),
          }),
          ...(dto.beatscodeId !== undefined && {
            beatscodeId: dto.beatscodeId,
          }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
          ...(dto.active !== undefined && { active: dto.active }),
          ...(teamCategory !== undefined && { teamCategory }),
        },
        include: this.uniformKitInclude(),
      });
    });
  }

  async removeUniformKit(actor: UniformKitActor, id: string) {
    const current = await this.findUniformKit(actor, id);
    const allowed = await this.allowedTenantIds(actor);
    this.assertCanMutateKit(allowed, current);
    await this.prisma.logisticsUniformKit.delete({ where: { id } });
  }
}
