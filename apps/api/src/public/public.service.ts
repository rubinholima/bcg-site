import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PortfolioItemDto } from './dto/portfolio-item.dto';

function isClubKind(kindName: string | null): boolean {
  if (!kindName) return false;
  const k = kindName.toLowerCase();
  return k.includes('futebol') || k.includes('clube') || k.includes('football');
}

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getPortfolio(): Promise<PortfolioItemDto[]> {
    const tenants = await this.prisma.tenant.findMany({
      include: { kind: true },
      orderBy: { name: 'asc' },
    });
    return tenants.map((t) => {
      const type = isClubKind(t.kind?.name ?? null) ? 'club' : 'company';
      const subdomain = t.slug;
      const websiteUrl =
        type === 'club'
          ? `https://${subdomain}.bostoncitygroup.biz`
          : null;
      return {
        id: t.id,
        type,
        name: t.name,
        slug: t.slug,
        shortDescription: null,
        logoUrl: t.logoUrl ?? null,
        websiteUrl,
        email: null,
        phone: null,
        location: null,
        address: t.address ?? null,
        contactName: t.contactName ?? null,
        contactPhone: t.contactPhone ?? null,
        segment: t.kind?.name ?? null,
        subdomain,
        isActive: true,
      } satisfies PortfolioItemDto;
    });
  }
}
