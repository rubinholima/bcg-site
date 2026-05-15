import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetCategoryDto } from './dto/create-asset-category.dto';
import { UpdateAssetCategoryDto } from './dto/update-asset-category.dto';

@Injectable()
export class AssetCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    return this.prisma.assetCategory.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.assetCategory.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    return cat;
  }

  async create(dto: CreateAssetCategoryDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return this.prisma.assetCategory.create({
      data: {
        tenantId: dto.tenantId,
        name: cadastroUpperRequired(dto.name),
        code: cadastroUpper(dto.code),
        kind: dto.kind ?? 'general',
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateAssetCategoryDto) {
    await this.findOne(id);
    return this.prisma.assetCategory.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.code !== undefined && { code: cadastroUpper(dto.code) }),
        ...(dto.kind != null && { kind: dto.kind }),
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const count = await this.prisma.asset.count({ where: { categoryId: id } });
    if (count > 0) throw new BadRequestException('Categoria possui bens vinculados. Remova ou altere os bens antes.');
    await this.prisma.assetCategory.delete({ where: { id } });
  }
}
