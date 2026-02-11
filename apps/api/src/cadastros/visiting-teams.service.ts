import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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
    const existing = await this.prisma.visitingTeam.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) throw new ConflictException(`Time "${dto.name}" já existe`);
    return this.prisma.visitingTeam.create({
      data: {
        name: dto.name.trim(),
        logoUrl: dto.logoUrl?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateVisitingTeamDto) {
    await this.findOne(id);
    if (dto.name) {
      const existing = await this.prisma.visitingTeam.findFirst({
        where: { name: dto.name.trim(), id: { not: id } },
      });
      if (existing) throw new ConflictException(`Time "${dto.name}" já existe`);
    }
    return this.prisma.visitingTeam.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl?.trim() || null }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.visitingTeam.delete({ where: { id } });
  }
}
