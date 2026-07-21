import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { computeEntryPricing, decimalToNumber, toDecimal } from './product-pricing.util';

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
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            currentStock: true,
            averagePrice: true,
            currentPrice: true,
            purchasePrice: true,
          },
        },
      },
    });
  }

  async create(dto: CreateStockMovementDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Produto não encontrado');

    const qty = dto.quantity;
    if (qty === 0) throw new BadRequestException('Quantidade não pode ser zero');

    const isEntry = qty > 0;
    if (isEntry && (dto.unitPrice == null || dto.unitPrice < 0)) {
      throw new BadRequestException('Informe o preço unitário na entrada de estoque');
    }

    const newStock = product.currentStock + qty;
    if (newStock < 0) throw new BadRequestException('Estoque insuficiente para esta baixa');

    const productUpdate: {
      currentStock: number;
      purchasePrice?: ReturnType<typeof toDecimal>;
      currentPrice?: ReturnType<typeof toDecimal>;
      averagePrice?: ReturnType<typeof toDecimal>;
    } = { currentStock: newStock };

    if (isEntry && dto.unitPrice != null) {
      const pricing = computeEntryPricing(
        product.currentStock,
        decimalToNumber(product.averagePrice),
        qty,
        dto.unitPrice,
      );
      productUpdate.purchasePrice = toDecimal(pricing.purchasePrice);
      productUpdate.currentPrice = toDecimal(pricing.currentPrice);
      productUpdate.averagePrice = toDecimal(pricing.averagePrice);
    }

    const [movement] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          productId: dto.productId,
          quantity: dto.quantity,
          type: dto.type,
          unitPrice: isEntry && dto.unitPrice != null ? toDecimal(dto.unitPrice) : null,
          referenceType: dto.referenceType ?? null,
          referenceId: dto.referenceId ?? null,
          notes: dto.notes ?? null,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              currentStock: true,
              averagePrice: true,
              currentPrice: true,
              purchasePrice: true,
            },
          },
        },
      }),
      this.prisma.product.update({
        where: { id: dto.productId },
        data: productUpdate,
      }),
    ]);
    return movement;
  }
}
