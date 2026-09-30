import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type TryoutWorkflowEventType =
  | 'direct_creation'
  | 'captacao_referral'
  | 'arrival'
  | 'document_upload'
  | 'document_removed'
  | 'documentation_validated'
  | 'physio_referral'
  | 'physio_clearance'
  | 'physio_reassessment'
  | 'field_evaluation_start'
  | 'cycle_end'
  | 'weekly_evaluation'
  | 'one_more_week'
  | 'coach_change'
  | 'coach_approval'
  | 'coach_rejection'
  | 'management_decision'
  | 'promotion'
  | 'closure'
  | 'legacy_activation'
  | 'duplicate_decision';

@Injectable()
export class TryoutWorkflowEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async append(input: {
    tenantId: string;
    prospectId: string;
    eventType: TryoutWorkflowEventType;
    previousStage?: string | null;
    newStage?: string | null;
    actorUserId?: string | null;
    staffId?: string | null;
    metadata?: Record<string, unknown> | null;
    tx?: Prisma.TransactionClient;
  }) {
    const client = input.tx ?? this.prisma;
    return client.tryoutWorkflowEvent.create({
      data: {
        tenantId: input.tenantId,
        prospectId: input.prospectId,
        eventType: input.eventType,
        previousStage: input.previousStage ?? null,
        newStage: input.newStage ?? null,
        actorUserId: input.actorUserId ?? null,
        staffId: input.staffId ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async listForProspect(prospectId: string, take = 100) {
    return this.prisma.tryoutWorkflowEvent.findMany({
      where: { prospectId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
