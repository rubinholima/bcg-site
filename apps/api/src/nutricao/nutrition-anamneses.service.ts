import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNutritionAnamnesisDto } from './dto/create-nutrition-anamnesis.dto';
import { UpdateNutritionAnamnesisDto } from './dto/update-nutrition-anamnesis.dto';

@Injectable()
export class NutritionAnamnesesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string, playerId?: string) {
    return this.prisma.nutritionAnamnesis.findMany({
      where: {
        player: {
          tenantId,
          ...(playerId ? { id: playerId } : {}),
        },
      },
      orderBy: [{ assessedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        player: {
          select: {
            id: true,
            name: true,
            jerseyNumber: true,
            category: true,
            tenantId: true,
          },
        },
      },
    });
  }

  async findByPlayer(playerId: string) {
    return this.prisma.nutritionAnamnesis.findMany({
      where: { playerId },
      orderBy: [{ assessedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.nutritionAnamnesis.findUnique({
      where: { id },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            jerseyNumber: true,
            category: true,
            tenantId: true,
            weight: true,
            height: true,
            bmi: true,
            bodyFatPercent: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Anamnese nutricional não encontrada');
    return row;
  }

  async create(dto: CreateNutritionAnamnesisDto) {
    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    return this.prisma.nutritionAnamnesis.create({
      data: {
        playerId: dto.playerId,
        assessedAt: new Date(dto.assessedAt),
        data: dto.data as Prisma.InputJsonValue,
        notes: dto.notes ?? null,
      },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            jerseyNumber: true,
            category: true,
            tenantId: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateNutritionAnamnesisDto) {
    await this.findOne(id);
    return this.prisma.nutritionAnamnesis.update({
      where: { id },
      data: {
        ...(dto.assessedAt != null && { assessedAt: new Date(dto.assessedAt) }),
        ...(dto.data != null && { data: dto.data as Prisma.InputJsonValue }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
      },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            jerseyNumber: true,
            category: true,
            tenantId: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.nutritionAnamnesis.delete({ where: { id } });
  }
}
