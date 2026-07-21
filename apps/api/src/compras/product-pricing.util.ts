import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

export function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

/** Calcula saldo e preços após uma entrada com valor unitário. */
export function computeEntryPricing(
  oldStock: number,
  oldAverage: number | null,
  entryQty: number,
  unitPrice: number,
): {
  newStock: number;
  averagePrice: number;
  currentPrice: number;
  purchasePrice: number;
} {
  if (entryQty <= 0) throw new BadRequestException('Quantidade de entrada deve ser positiva');
  if (unitPrice < 0) throw new BadRequestException('Preço unitário inválido');

  const newStock = oldStock + entryQty;
  const averagePrice =
    oldStock <= 0 || oldAverage == null
      ? unitPrice
      : (oldStock * oldAverage + entryQty * unitPrice) / newStock;

  return {
    newStock,
    averagePrice: Math.round(averagePrice * 100) / 100,
    currentPrice: unitPrice,
    purchasePrice: unitPrice,
  };
}
