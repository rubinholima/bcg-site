import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStadiumDto } from './dto/create-stadium.dto';
import { UpdateStadiumDto } from './dto/update-stadium.dto';

@Injectable()
export class StadiumsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.stadium.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const item = await this.prisma.stadium.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Estádio não encontrado`);
    return item;
  }

  async create(dto: CreateStadiumDto) {
    const existing = await this.prisma.stadium.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) throw new ConflictException(`Estádio "${dto.name}" já existe`);
    return this.prisma.stadium.create({
      data: {
        name: dto.name.trim(),
        city: dto.city?.trim() || null,
        country: dto.country?.trim() || null,
        address: dto.address?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateStadiumDto) {
    await this.findOne(id);
    if (dto.name) {
      const existing = await this.prisma.stadium.findFirst({
        where: { name: dto.name.trim(), id: { not: id } },
      });
      if (existing) throw new ConflictException(`Estádio "${dto.name}" já existe`);
    }
    return this.prisma.stadium.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.city !== undefined && { city: dto.city?.trim() || null }),
        ...(dto.country !== undefined && { country: dto.country?.trim() || null }),
        ...(dto.address !== undefined && { address: dto.address?.trim() || null }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.stadium.delete({ where: { id } });
  }
}
