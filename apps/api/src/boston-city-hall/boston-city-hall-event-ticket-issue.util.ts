import { Prisma } from '@prisma/client';
import {
  generateHumanTicketCode,
  generateQrToken,
} from './boston-city-hall-ticket-credential.util';

export function orderItemIssuanceKey(orderItemId: string, lineIndex: number): string {
  return `order_item:${orderItemId}:${lineIndex}`;
}

export function complimentaryIssuanceKey(admissionId: string, lineIndex: number): string {
  return `complimentary:${admissionId}:${lineIndex}`;
}

export type CreateEventTicketRowInput = {
  tenantId: string;
  eventId: string;
  issuanceKey: string;
  admissionSource: 'paid_order' | 'complimentary';
  orderId?: string | null;
  orderItemId?: string | null;
  complimentaryAdmissionId?: string | null;
  ticketTypeId: string;
  ticketLotId: string | null;
  lineIndex: number;
  orderNumber: string;
  ticketTypeName: string;
  lotName: string | null;
  unitPrice: Prisma.Decimal;
  currency: string;
  eventName: string;
  holderName: string;
  holderEmail: string | null;
  issuedAt: Date;
};

export async function createEventTicketInTx(
  tx: Prisma.TransactionClient,
  data: CreateEventTicketRowInput,
): Promise<'created' | 'exists'> {
  const existing = await tx.eventTicket.findUnique({
    where: { issuanceKey: data.issuanceKey },
  });
  if (existing) return 'exists';

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      await tx.eventTicket.create({
        data: {
          tenantId: data.tenantId,
          eventId: data.eventId,
          issuanceKey: data.issuanceKey,
          admissionSource: data.admissionSource,
          orderId: data.orderId ?? null,
          orderItemId: data.orderItemId ?? null,
          complimentaryAdmissionId: data.complimentaryAdmissionId ?? null,
          ticketTypeId: data.ticketTypeId,
          ticketLotId: data.ticketLotId,
          lineIndex: data.lineIndex,
          ticketCode: generateHumanTicketCode(data.issuedAt),
          qrToken: generateQrToken(),
          status: 'valid',
          orderNumber: data.orderNumber,
          ticketTypeName: data.ticketTypeName,
          lotName: data.lotName,
          unitPrice: data.unitPrice,
          currency: data.currency,
          eventName: data.eventName,
          holderName: data.holderName,
          holderEmail: data.holderEmail,
          issuedAt: data.issuedAt,
        },
      });
      return 'created';
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const again = await tx.eventTicket.findUnique({
          where: { issuanceKey: data.issuanceKey },
        });
        if (again) return 'exists';
        continue;
      }
      throw e;
    }
  }
  return 'exists';
}
