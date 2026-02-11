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
    return this.prisma.championship.create({ data: { name: dto.name.trim() } });
  }

  async update(id: string, dto: UpdateChampionshipDto) {
    await this.findOne(id);
    if (dto.name) {
      const existing = await this.prisma.championship.findFirst({
        where: { name: dto.name.trim(), id: { not: id } },
      });
      if (existing) throw new ConflictException(`Campeonato "${dto.name}" já existe`);
    }
    return this.prisma.championship.update({
      where: { id },
      data: dto.name ? { name: dto.name.trim() } : {},
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.championship.delete({ where: { id } });
  }
}
