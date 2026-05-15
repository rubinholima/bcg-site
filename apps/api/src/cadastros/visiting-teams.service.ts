import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitingTeamDto } from './dto/create-visiting-team.dto';
import { UpdateVisitingTeamDto } from './dto/update-visiting-team.dto';

@Injectable()
export class VisitingTeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.visitingTeam.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const item = await this.prisma.visitingTeam.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Time não encontrado`);
    return item;
  }

  async create(dto: CreateVisitingTeamDto) {
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.visitingTeam.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`Time "${name}" já existe`);
    return this.prisma.visitingTeam.create({
      data: {
        name,
        logoUrl: dto.logoUrl?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateVisitingTeamDto) {
    await this.findOne(id);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.visitingTeam.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`Time "${name}" já existe`);
    }
    return this.prisma.visitingTeam.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl?.trim() || null }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.visitingTeam.delete({ where: { id } });
  }
}
