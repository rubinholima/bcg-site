import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_SLUG = 'bcg';

export interface GroupDto {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(slug: string = DEFAULT_SLUG): Promise<GroupDto> {
    let row = await this.prisma.group.findUnique({ where: { slug } });
    if (!row) {
      row = await this.prisma.group.create({
        data: {
          name: 'Grupo Master',
          slug,
        },
      });
    }
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logoUrl ?? null,
      description: row.description ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async update(
    slug: string,
    dto: { name?: string; logoUrl?: string; description?: string },
  ): Promise<GroupDto> {
    const existing = await this.prisma.group.findUnique({ where: { slug } });
    if (!existing) {
      throw new NotFoundException(`Grupo com slug "${slug}" não encontrado`);
    }
    try {
      const updated = await this.prisma.group.update({
        where: { slug },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
          ...(dto.description !== undefined && { description: dto.description }),
        },
      });
      return {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logoUrl: updated.logoUrl ?? null,
        description: updated.description ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `GroupService.update failed: ${message}`,
      );
    }
  }

  async updateLogoUrl(slug: string, logoUrl: string): Promise<GroupDto> {
    return this.update(slug, { logoUrl });
  }
}
