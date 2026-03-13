import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNutritionAssessmentDto } from './dto/create-nutrition-assessment.dto';
import { UpdateNutritionAssessmentDto } from './dto/update-nutrition-assessment.dto';

@Injectable()
export class NutritionAssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPlayer(playerId: string) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    return this.prisma.nutritionAssessment.findMany({
      where: { playerId },
      orderBy: [{ assessedAt: 'desc' }],
      include: { player: { select: { id: true, name: true, tenantId: true } } },
    });
  }

  async findByTenant(tenantId: string, playerId?: string) {
    const where: Record<string, unknown> = { player: { tenantId } };
    if (playerId) where.playerId = playerId;
    return this.prisma.nutritionAssessment.findMany({
      where,
      orderBy: [{ assessedAt: 'desc' }],
      include: { player: { select: { id: true, name: true, jerseyNumber: true, category: true } } },
    });
  }

  async findOne(id: string) {
    const a = await this.prisma.nutritionAssessment.findUnique({
      where: { id },
      include: { player: { select: { id: true, name: true, tenantId: true } } },
    });
    if (!a) throw new NotFoundException('Avaliação não encontrada');
    return a;
  }

  async create(dto: CreateNutritionAssessmentDto) {
    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    const assessedAt = new Date(dto.assessedAt);
    return this.prisma.nutritionAssessment.create({
      data: {
        playerId: dto.playerId,
        assessedAt,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm ?? null,
        bmi: dto.bmi ?? null,
        bodyFatPercent: dto.bodyFatPercent ?? null,
        notes: dto.notes ?? null,
      },
      include: { player: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateNutritionAssessmentDto) {
    await this.findOne(id);
    return this.prisma.nutritionAssessment.update({
      where: { id },
      data: {
        ...(dto.assessedAt != null && { assessedAt: new Date(dto.assessedAt) }),
        ...(dto.weightKg != null && { weightKg: dto.weightKg }),
        ...(dto.heightCm !== undefined && { heightCm: dto.heightCm ?? null }),
        ...(dto.bmi !== undefined && { bmi: dto.bmi ?? null }),
        ...(dto.bodyFatPercent !== undefined && { bodyFatPercent: dto.bodyFatPercent ?? null }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
      },
      include: { player: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.nutritionAssessment.delete({ where: { id } });
  }
}
