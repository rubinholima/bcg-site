import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChampionshipDto } from './dto/create-championship.dto';
import { UpdateChampionshipDto } from './dto/update-championship.dto';

@Injectable()
export class ChampionshipsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.championship.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const item = await this.prisma.championship.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Campeonato não encontrado`);
    return item;
  }

  async create(dto: CreateChampionshipDto) {
    const existing = await this.prisma.championship.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) throw new ConflictException(`Campeonato "${dto.name}" já existe`);
    return this.prisma.championship.create({
      data: {
        name: dto.name.trim(),
        logoUrl: dto.logoUrl?.trim() || null,
        standingsFormula: dto.standingsFormula?.trim() || null,
        standingsFormulaName: dto.standingsFormulaName?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateChampionshipDto) {
    await this.findOne(id);
    if (dto.name) {
      const existing = await this.prisma.championship.findFirst({
        where: { name: dto.name.trim(), id: { not: id } },
      });
      if (existing) throw new ConflictException(`Campeonato "${dto.name}" já existe`);
    }
    const data: { name?: string; logoUrl?: string | null; standingsFormula?: string | null; standingsFormulaName?: string | null } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl?.trim() || null;
    if (dto.standingsFormula !== undefined) data.standingsFormula = dto.standingsFormula?.trim() || null;
    if (dto.standingsFormulaName !== undefined) data.standingsFormulaName = dto.standingsFormulaName?.trim() || null;
    return this.prisma.championship.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.championship.delete({ where: { id } });
  }
}
