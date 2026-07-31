import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModulesService } from '../modules/modules.service';
import {
  CreateAgendaAreaDto,
  UpdateAgendaAreaDto,
} from './dto/agenda-area.dto';
import {
  CreateAgendaEventCategoryDto,
  UpdateAgendaEventCategoryDto,
} from './dto/agenda-event-category.dto';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normHex(v: string, field: string): string {
  const t = v.trim();
  if (!HEX.test(t)) throw new BadRequestException(`${field} deve ser cor hex (#RGB ou #RRGGBB)`);
  return t.toLowerCase();
}

function normSlug(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

@Injectable()
export class AgendaConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: ModulesService,
  ) {}

  private guardSystemEdit(isSystem: boolean) {
    if (isSystem) {
      throw new ForbiddenException('Registro padrão do sistema não pode ser excluído');
    }
  }

  async getConfigForUser(actorSub: string, role: string) {
    const [areas, categories] = await Promise.all([
      this.prisma.agendaArea.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      }),
      this.prisma.agendaEventCategory.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      }),
    ]);

    const moduleSlugs =
      role === 'super_admin'
        ? null
        : new Set(await this.modules.getSlugsForActor(actorSub, role));

    const visibleAreas = areas.filter((a) => {
      if (a.isPublic) return true;
      if (role === 'super_admin') return true;
      if (!a.moduleSlug) return false;
      return moduleSlugs?.has(a.moduleSlug) ?? false;
    });

    return { areas: visibleAreas, categories };
  }

  /** Super admin — listagem completa incluindo inativos */
  findAllAreas() {
    return this.prisma.agendaArea.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  findAllCategories() {
    return this.prisma.agendaEventCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async findArea(id: string) {
    const row = await this.prisma.agendaArea.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Área não encontrada');
    return row;
  }

  async createArea(dto: CreateAgendaAreaDto) {
    const slug = normSlug(dto.slug);
    const existing = await this.prisma.agendaArea.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Área "${slug}" já existe`);
    return this.prisma.agendaArea.create({
      data: {
        slug,
        label: dto.label.trim(),
        dataSource: dto.dataSource.trim(),
        moduleSlug: dto.moduleSlug?.trim() || null,
        isPublic: dto.isPublic ?? false,
        manageHref: dto.manageHref.trim(),
        createHref: dto.createHref?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async updateArea(id: string, dto: UpdateAgendaAreaDto) {
    const current = await this.findArea(id);
    return this.prisma.agendaArea.update({
      where: { id },
      data: {
        ...(dto.label && { label: dto.label.trim() }),
        ...(dto.dataSource && { dataSource: dto.dataSource.trim() }),
        ...(dto.moduleSlug !== undefined && { moduleSlug: dto.moduleSlug?.trim() || null }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
        ...(dto.manageHref && { manageHref: dto.manageHref.trim() }),
        ...(dto.createHref !== undefined && { createHref: dto.createHref?.trim() || null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removeArea(id: string) {
    const current = await this.findArea(id);
    this.guardSystemEdit(current.isSystem);
    await this.prisma.agendaArea.delete({ where: { id } });
  }

  async findCategory(id: string) {
    const row = await this.prisma.agendaEventCategory.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Categoria não encontrada');
    return row;
  }

  async createCategory(dto: CreateAgendaEventCategoryDto) {
    const slug = normSlug(dto.slug);
    const existing = await this.prisma.agendaEventCategory.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Categoria "${slug}" já existe`);
    return this.prisma.agendaEventCategory.create({
      data: {
        slug,
        label: dto.label.trim(),
        areaSlug: dto.areaSlug?.trim() || null,
        eventType: dto.eventType?.trim() || null,
        matchSide: dto.matchSide?.trim() || null,
        bgColor: normHex(dto.bgColor, 'Cor de fundo'),
        textColor: normHex(dto.textColor, 'Cor do texto'),
        borderColor: normHex(dto.borderColor, 'Cor da borda'),
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateAgendaEventCategoryDto) {
    await this.findCategory(id);
    return this.prisma.agendaEventCategory.update({
      where: { id },
      data: {
        ...(dto.label && { label: dto.label.trim() }),
        ...(dto.areaSlug !== undefined && { areaSlug: dto.areaSlug?.trim() || null }),
        ...(dto.eventType !== undefined && { eventType: dto.eventType?.trim() || null }),
        ...(dto.matchSide !== undefined && { matchSide: dto.matchSide?.trim() || null }),
        ...(dto.bgColor && { bgColor: normHex(dto.bgColor, 'Cor de fundo') }),
        ...(dto.textColor && { textColor: normHex(dto.textColor, 'Cor do texto') }),
        ...(dto.borderColor && { borderColor: normHex(dto.borderColor, 'Cor da borda') }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removeCategory(id: string) {
    const current = await this.findCategory(id);
    this.guardSystemEdit(current.isSystem);
    await this.prisma.agendaEventCategory.delete({ where: { id } });
  }
}
