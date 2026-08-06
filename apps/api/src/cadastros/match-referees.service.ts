import { Injectable, NotFoundException } from '@nestjs/common';
import { cadastroEmail, cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchRefereeDto } from './dto/create-match-referee.dto';
import { UpdateMatchRefereeDto } from './dto/update-match-referee.dto';

@Injectable()
export class MatchRefereesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(q?: string, activeOnly = false) {
    const term = q?.trim();
    return this.prisma.matchReferee.findMany({
      where: {
        ...(activeOnly ? { active: true } : {}),
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { federation: { contains: term, mode: 'insensitive' } },
                { licenseNumber: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.matchReferee.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Árbitro não encontrado');
    return row;
  }

  async create(dto: CreateMatchRefereeDto) {
    return this.prisma.matchReferee.create({
      data: {
        name: cadastroUpperRequired(dto.name),
        photoUrl: dto.photoUrl?.trim() || null,
        federation: cadastroUpper(dto.federation),
        licenseNumber: cadastroUpper(dto.licenseNumber),
        phone: cadastroUpper(dto.phone),
        email: cadastroEmail(dto.email),
        notes: cadastroUpper(dto.notes),
        active: dto.active !== false,
      },
    });
  }

  async update(id: string, dto: UpdateMatchRefereeDto) {
    await this.findOne(id);
    return this.prisma.matchReferee.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: cadastroUpperRequired(dto.name) } : {}),
        ...(dto.photoUrl !== undefined
          ? { photoUrl: dto.photoUrl?.trim() || null }
          : {}),
        ...(dto.federation !== undefined
          ? { federation: cadastroUpper(dto.federation) }
          : {}),
        ...(dto.licenseNumber !== undefined
          ? { licenseNumber: cadastroUpper(dto.licenseNumber) }
          : {}),
        ...(dto.phone !== undefined ? { phone: cadastroUpper(dto.phone) } : {}),
        ...(dto.email !== undefined ? { email: cadastroEmail(dto.email) } : {}),
        ...(dto.notes !== undefined ? { notes: cadastroUpper(dto.notes) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.matchReferee.delete({ where: { id } });
    return { ok: true };
  }
}
