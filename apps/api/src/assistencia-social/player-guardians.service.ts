import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerGuardianDto, UpdatePlayerGuardianDto } from './dto/player-guardian.dto';

@Injectable()
export class PlayerGuardiansService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPlayer(playerId: string) {
    return this.prisma.playerGuardian.findMany({
      where: { playerId },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.playerGuardian.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Responsável não encontrado');
    return row;
  }

  async create(dto: CreatePlayerGuardianDto) {
    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player) throw new NotFoundException('Jogador não encontrado');
    if (dto.isPrimary) {
      await this.prisma.playerGuardian.updateMany({
        where: { playerId: dto.playerId },
        data: { isPrimary: false },
      });
    }
    return this.prisma.playerGuardian.create({
      data: {
        playerId: dto.playerId,
        name: dto.name,
        relationship: dto.relationship,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        cpf: dto.cpf ?? null,
        address: dto.address ? (dto.address as Prisma.InputJsonValue) : Prisma.JsonNull,
        isPrimary: dto.isPrimary ?? false,
        notes: dto.notes ?? null,
      },
    });
  }

  async update(id: string, dto: UpdatePlayerGuardianDto) {
    const row = await this.findOne(id);
    if (dto.isPrimary) {
      await this.prisma.playerGuardian.updateMany({
        where: { playerId: row.playerId },
        data: { isPrimary: false },
      });
    }
    return this.prisma.playerGuardian.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.relationship != null && { relationship: dto.relationship }),
        ...(dto.phone !== undefined && { phone: dto.phone ?? null }),
        ...(dto.email !== undefined && { email: dto.email ?? null }),
        ...(dto.cpf !== undefined && { cpf: dto.cpf ?? null }),
        ...(dto.address !== undefined && {
          address: dto.address ? (dto.address as Prisma.InputJsonValue) : Prisma.JsonNull,
        }),
        ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.playerGuardian.delete({ where: { id } });
  }
}
