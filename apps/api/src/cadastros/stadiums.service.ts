import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
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
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.stadium.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`Estádio "${name}" já existe`);
    return this.prisma.stadium.create({
      data: {
        name,
        city: cadastroUpper(dto.city),
        country: cadastroUpper(dto.country),
        address: cadastroUpper(dto.address),
      },
    });
  }

  async update(id: string, dto: UpdateStadiumDto) {
    await this.findOne(id);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.stadium.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`Estádio "${name}" já existe`);
    }
    return this.prisma.stadium.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.city !== undefined && { city: cadastroUpper(dto.city) }),
        ...(dto.country !== undefined && { country: cadastroUpper(dto.country) }),
        ...(dto.address !== undefined && { address: cadastroUpper(dto.address) }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.stadium.delete({ where: { id } });
  }
}
