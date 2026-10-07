import { Prisma } from '@prisma/client';

export const BCH_BAR_CONTENT_EMPTY_TOLERANCE = new Prisma.Decimal('0.001');

export type PhysicalUnitLike = {
  volumeMl: number | null;
  quantityBasis: Prisma.Decimal;
};

export type SellingUnitLike = {
  portionAmount: Prisma.Decimal | null;
  portionUnit: string | null;
  physicalUnitsConsumedPerSale: Prisma.Decimal;
  expectedPortionsPerPhysical: Prisma.Decimal | null;
};

/** Conteúdo de uma unidade física fechada (ex.: 750 ml ou 1 unit). */
export function getOriginalContentForPhysicalUnit(
  physical: PhysicalUnitLike,
): { amount: Prisma.Decimal; unit: string } {
  if (physical.volumeMl != null && physical.volumeMl > 0) {
    return {
      amount: new Prisma.Decimal(physical.volumeMl).mul(physical.quantityBasis),
      unit: 'ml',
    };
  }
  return { amount: physical.quantityBasis, unit: 'unit' };
}

/** Venda consome unidade física inteira (ledger), não porção aberta. */
export function isWholePhysicalUnitSale(sellingUnit: SellingUnitLike): boolean {
  return sellingUnit.physicalUnitsConsumedPerSale.greaterThanOrEqualTo(1);
}

/** Quantidade de conteúdo consumida por uma venda da unidade comercial (porção). */
export function getPortionContentAmount(
  sellingUnit: SellingUnitLike,
  physical: PhysicalUnitLike,
): Prisma.Decimal {
  if (isWholePhysicalUnitSale(sellingUnit)) {
    const orig = getOriginalContentForPhysicalUnit(physical);
    return orig.amount.mul(sellingUnit.physicalUnitsConsumedPerSale);
  }
  if (
    sellingUnit.portionAmount != null &&
    sellingUnit.portionUnit?.toLowerCase() === 'ml'
  ) {
    return sellingUnit.portionAmount;
  }
  const orig = getOriginalContentForPhysicalUnit(physical);
  if (orig.unit === 'ml') {
    return orig.amount.mul(sellingUnit.physicalUnitsConsumedPerSale);
  }
  return sellingUnit.physicalUnitsConsumedPerSale.mul(orig.amount);
}

export function expectedPortionsFromRemaining(
  remaining: Prisma.Decimal,
  portionAmount: Prisma.Decimal,
): Prisma.Decimal {
  if (portionAmount.lte(0)) return new Prisma.Decimal(0);
  return remaining.div(portionAmount).floor();
}

export function formatPortionLabel(
  sellingUnit: SellingUnitLike,
  physical: PhysicalUnitLike,
): { consumeLabel: string; yieldLabel: string | null } {
  if (isWholePhysicalUnitSale(sellingUnit)) {
    const n = decDisplay(sellingUnit.physicalUnitsConsumedPerSale);
    return {
      consumeLabel: `${n} unidade(s) física(s) por venda`,
      yieldLabel: null,
    };
  }
  const portion = getPortionContentAmount(sellingUnit, physical);
  const orig = getOriginalContentForPhysicalUnit(physical);
  let consumeLabel: string;
  if (sellingUnit.portionAmount != null && sellingUnit.portionUnit) {
    consumeLabel = `${decDisplay(sellingUnit.portionAmount)} ${sellingUnit.portionUnit} por venda`;
  } else if (orig.unit === 'ml') {
    consumeLabel = `${decDisplay(portion)} ml por venda`;
  } else {
    consumeLabel = `${decDisplay(portion)} por venda`;
  }
  const yieldN =
    sellingUnit.expectedPortionsPerPhysical ??
    (orig.amount.gt(0) ? orig.amount.div(portion).floor() : null);
  const yieldLabel =
    yieldN != null ? `${decDisplay(yieldN)} por unidade física` : null;
  return { consumeLabel, yieldLabel };
}

function decDisplay(v: Prisma.Decimal): string {
  return v.toFixed(4).replace(/\.?0+$/, '') || '0';
}
