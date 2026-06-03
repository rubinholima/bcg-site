import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFixtureCategoryDto } from './dto/create-fixture-category.dto';
import { UpdateFixtureCategoryDto } from './dto/update-fixture-category.dto';

export type FixtureCategoryDto = {
  id: string;
  value: string;
  labelPT: string;
  labelEN: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

function toDto(row: {
  id: string;
  value: string;
  labelPT: string;
  labelEN: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): FixtureCategoryDto {
  return {
    id: row.id,
    value: row.value,
    labelPT: row.labelPT,
    labelEN: row.labelEN,
    sortOrder: row.sortOrder,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class FixtureCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options?: { activeOnly?: boolean }): Promise<FixtureCategoryDto[]> {
    const rows = await this.prisma.fixtureCategory.findMany({
      where: options?.activeOnly ? { active: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { labelPT: 'asc' }],
    });
    return rows.map(toDto);
  }

  async findOne(id: string): Promise<FixtureCategoryDto> {
    const row = await this.prisma.fixtureCategory.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Categoria não encontrada');
    return toDto(row);
  }

  async findByValue(value: string): Promise<FixtureCategoryDto | null> {
    const row = await this.prisma.fixtureCategory.findUnique({
      where: { value: value.trim() },
    });
    return row ? toDto(row) : null;
  }

  async create(dto: CreateFixtureCategoryDto): Promise<FixtureCategoryDto> {
    const value = dto.value.trim().toLowerCase();
    const existing = await this.prisma.fixtureCategory.findUnique({
      where: { value },
    });
    if (existing) {
      throw new ConflictException(`Categoria com slug "${value}" já existe`);
    }
    const row = await this.prisma.fixtureCategory.create({
      data: {
        value,
        labelPT: dto.labelPT.trim(),
        labelEN: dto.labelEN.trim(),
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
    return toDto(row);
  }

  async update(id: string, dto: UpdateFixtureCategoryDto): Promise<FixtureCategoryDto> {
    await this.findOne(id);
    const row = await this.prisma.fixtureCategory.update({
      where: { id },
      data: {
        ...(dto.labelPT !== undefined && { labelPT: dto.labelPT.trim() }),
        ...(dto.labelEN !== undefined && { labelEN: dto.labelEN.trim() }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
    return toDto(row);
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.findOne(id);
    await this.prisma.fixtureCategory.update({
      where: { id },
      data: { active: false },
    });
    return { ok: true };
  }
}
