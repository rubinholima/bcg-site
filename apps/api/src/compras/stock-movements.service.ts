import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProduct(productId: string, limit = 50) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return this.prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { product: { select: { id: true, name: true, sku: true, unit: true, currentStock: true } } },
    });
  }

  async create(dto: CreateStockMovementDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Produto não encontrado');
    const newStock = product.currentStock + dto.quantity;
    if (newStock < 0) throw new BadRequestException('Estoque insuficiente para esta baixa');
    const [movement] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          productId: dto.productId,
          quantity: dto.quantity,
          type: dto.type,
          referenceType: dto.referenceType ?? null,
          referenceId: dto.referenceId ?? null,
          notes: dto.notes ?? null,
        },
        include: { product: { select: { id: true, name: true, sku: true, unit: true, currentStock: true } } },
      }),
      this.prisma.product.update({
        where: { id: dto.productId },
        data: { currentStock: newStock },
      }),
    ]);
    return movement;
  }
}
