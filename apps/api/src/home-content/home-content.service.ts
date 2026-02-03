import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SLUG = 'home';

export type HomeContentBlockDto = {
  id: string;
  type: string;
  sortOrder: number;
  config?: Record<string, unknown>;
};

export type HomeContentDto = {
  pt?: Record<string, unknown>;
  en?: Record<string, unknown>;
  images?: { hero?: string; what?: string; founder?: string; cta?: string };
  blocks?: HomeContentBlockDto[];
};

@Injectable()
export class HomeContentService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<HomeContentDto> {
    const row = await this.prisma.homeContent.findUnique({
      where: { slug: SLUG },
    });
    if (!row || !row.content || typeof row.content !== 'object') {
      return {};
    }
    return row.content as HomeContentDto;
  }

  async update(dto: HomeContentDto): Promise<HomeContentDto> {
    const content = (dto && typeof dto === 'object') ? dto : {};
    await this.prisma.homeContent.upsert({
      where: { slug: SLUG },
      create: { slug: SLUG, content: content as object },
      update: { content: content as object },
    });
    return this.get();
  }
}
