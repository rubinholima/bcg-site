import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
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
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.championship.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`Campeonato "${name}" já existe`);
    return this.prisma.championship.create({
      data: {
        name,
        logoUrl: dto.logoUrl?.trim() || null,
        standingsFormula: cadastroUpper(dto.standingsFormula),
        standingsFormulaName: cadastroUpper(dto.standingsFormulaName),
      },
    });
  }

  async update(id: string, dto: UpdateChampionshipDto) {
    await this.findOne(id);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.championship.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`Campeonato "${name}" já existe`);
    }
    const data: { name?: string; logoUrl?: string | null; standingsFormula?: string | null; standingsFormulaName?: string | null } = {};
    if (dto.name !== undefined) data.name = cadastroUpperRequired(dto.name);
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl?.trim() || null;
    if (dto.standingsFormula !== undefined) data.standingsFormula = cadastroUpper(dto.standingsFormula);
    if (dto.standingsFormulaName !== undefined) data.standingsFormulaName = cadastroUpper(dto.standingsFormulaName);
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
