import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatMatchClock } from './player-dossier-analysis-material.util';

export type DossierEligibleAnalysisMaterialDto = {
  materialItemId: string;
  sessionId: string;
  sessionTitle: string;
  sessionKind: string;
  category: string | null;
  sessionDate: string | null;
  tagLabel: string | null;
  outcome: string | null;
  matchPeriod: string | null;
  matchClockDisplay: string | null;
  analystNote: string | null;
  hasClip: boolean;
  clipInterval: string | null;
};

export type DossierResolvedAnalysisMaterialBlock = DossierEligibleAnalysisMaterialDto & {
  eventNotes: string | null;
  clipTitle: string | null;
  quantitativeContext: string | null;
};

function isoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatClipInterval(startMs: number, endMs: number): string {
  const fmt = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  return `${fmt(startMs)} – ${fmt(endMs)}`;
}

@Injectable()
export class PlayerDossierAnalysisMaterialService {
  constructor(private readonly prisma: PrismaService) {}

  private assertTenantAccess(tenantId: string, allowedTenantIds: string[] | null) {
    if (allowedTenantIds == null) return;
    if (!allowedTenantIds.includes(tenantId)) {
      throw new NotFoundException('Atleta não encontrado.');
    }
  }

  async listEligible(input: {
    playerId: string;
    tenantId: string;
    allowedTenantIds: string[] | null;
  }): Promise<DossierEligibleAnalysisMaterialDto[]> {
    this.assertTenantAccess(input.tenantId, input.allowedTenantIds);
    const rows = await this.prisma.analysisPlayerMaterialItem.findMany({
      where: { playerId: input.playerId, tenantId: input.tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        analysisSession: { select: { id: true, title: true, kind: true, category: true, updatedAt: true } },
        event: {
          include: { tagDefinition: { select: { label: true } } },
        },
        clip: { select: { id: true, title: true, startMs: true, endMs: true } },
      },
    });
    return rows.map((row) => this.toEligibleDto(row));
  }

  private toEligibleDto(row: {
    id: string;
    notes: string | null;
    analysisSession: { id: string; title: string; kind: string; category: string | null; updatedAt: Date };
    event: {
      outcome: string | null;
      matchPeriod: string | null;
      matchClockSeconds: number | null;
      notes: string | null;
      tagDefinition: { label: string } | null;
    } | null;
    clip: { title: string; startMs: number; endMs: number } | null;
  }): DossierEligibleAnalysisMaterialDto {
    return {
      materialItemId: row.id,
      sessionId: row.analysisSession.id,
      sessionTitle: row.analysisSession.title,
      sessionKind: row.analysisSession.kind,
      category: row.analysisSession.category,
      sessionDate: isoDate(row.analysisSession.updatedAt),
      tagLabel: row.event?.tagDefinition?.label ?? null,
      outcome: row.event?.outcome ?? null,
      matchPeriod: row.event?.matchPeriod ?? null,
      matchClockDisplay: formatMatchClock(row.event?.matchClockSeconds),
      analystNote: row.notes?.trim() || null,
      hasClip: Boolean(row.clip),
      clipInterval: row.clip ? formatClipInterval(row.clip.startMs, row.clip.endMs) : null,
    };
  }

  async resolveSelected(input: {
    playerId: string;
    tenantId: string;
    allowedTenantIds: string[] | null;
    materialIds: string[];
  }): Promise<DossierResolvedAnalysisMaterialBlock[]> {
    if (input.materialIds.length === 0) return [];
    this.assertTenantAccess(input.tenantId, input.allowedTenantIds);

    const rows = await this.prisma.analysisPlayerMaterialItem.findMany({
      where: {
        id: { in: input.materialIds },
        playerId: input.playerId,
        tenantId: input.tenantId,
      },
      include: {
        analysisSession: { select: { id: true, title: true, kind: true, category: true, updatedAt: true } },
        event: {
          include: { tagDefinition: { select: { label: true, key: true } } },
        },
        clip: { select: { id: true, title: true, startMs: true, endMs: true } },
      },
    });

    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered: DossierResolvedAnalysisMaterialBlock[] = [];
    for (const id of input.materialIds) {
      const row = byId.get(id);
      if (!row) {
        throw new BadRequestException('Material de análise inválido ou de outro atleta.');
      }
      const base = this.toEligibleDto(row);
      const tag = row.event?.tagDefinition;
      const quantitativeContext =
        tag?.label && row.event?.outcome
          ? `${tag.label} · ${row.event.outcome}`
          : tag?.label ?? null;
      ordered.push({
        ...base,
        eventNotes: row.event?.notes?.trim() || null,
        clipTitle: row.clip?.title ?? null,
        quantitativeContext,
      });
    }
    return ordered;
  }
}
