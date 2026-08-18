import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePlayerSchoolEnrollmentDto,
  UpdatePlayerSchoolEnrollmentDto,
} from './dto/player-school-enrollment.dto';

@Injectable()
export class PlayerSchoolEnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPlayer(playerId: string) {
    return this.prisma.playerSchoolEnrollment.findMany({
      where: { playerId },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.playerSchoolEnrollment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Matrícula escolar não encontrada');
    return row;
  }

  async create(dto: CreatePlayerSchoolEnrollmentDto) {
    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    if (dto.status === 'ativo' || !dto.status) {
      await this.prisma.playerSchoolEnrollment.updateMany({
        where: { playerId: dto.playerId, status: 'ativo' },
        data: { status: 'transferido', endDate: new Date() },
      });
    }
    return this.prisma.playerSchoolEnrollment.create({
      data: {
        playerId: dto.playerId,
        schoolName: dto.schoolName,
        grade: dto.grade ?? null,
        period: dto.period ?? null,
        shift: dto.shift ?? null,
        city: dto.city ?? null,
        coordinatorName: dto.coordinatorName ?? null,
        coordinatorEmail: dto.coordinatorEmail ?? null,
        coordinatorPhone: dto.coordinatorPhone ?? null,
        schoolYear: dto.schoolYear ?? null,
        status: dto.status ?? 'ativo',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notes: dto.notes ?? null,
      },
    });
  }

  async update(id: string, dto: UpdatePlayerSchoolEnrollmentDto) {
    const row = await this.findOne(id);
    if (dto.status === 'ativo') {
      await this.prisma.playerSchoolEnrollment.updateMany({
        where: { playerId: row.playerId, status: 'ativo', id: { not: id } },
        data: { status: 'transferido', endDate: new Date() },
      });
    }
    return this.prisma.playerSchoolEnrollment.update({
      where: { id },
      data: {
        ...(dto.schoolName != null && { schoolName: dto.schoolName }),
        ...(dto.grade !== undefined && { grade: dto.grade ?? null }),
        ...(dto.period !== undefined && { period: dto.period ?? null }),
        ...(dto.shift !== undefined && { shift: dto.shift ?? null }),
        ...(dto.city !== undefined && { city: dto.city ?? null }),
        ...(dto.coordinatorName !== undefined && { coordinatorName: dto.coordinatorName ?? null }),
        ...(dto.coordinatorEmail !== undefined && { coordinatorEmail: dto.coordinatorEmail ?? null }),
        ...(dto.coordinatorPhone !== undefined && { coordinatorPhone: dto.coordinatorPhone ?? null }),
        ...(dto.schoolYear !== undefined && { schoolYear: dto.schoolYear ?? null }),
        ...(dto.status != null && { status: dto.status }),
        ...(dto.startDate != null && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate != null && { endDate: new Date(dto.endDate) }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.playerSchoolEnrollment.delete({ where: { id } });
  }
}
