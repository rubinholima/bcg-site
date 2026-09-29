import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  MedicalEvolutionNote,
  MedicalTimelineSourceType,
} from './medical-encounter.constants';

export type MedicalTimelineItem = {
  id: string;
  sourceType: MedicalTimelineSourceType;
  occurredAt: string;
  title: string;
  summary: string | null;
  readOnly: boolean;
  sourceId: string;
};

function isoDateTime(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function excerpt(text: string | null | undefined, max = 160): string | null {
  if (!text?.trim()) return null;
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

@Injectable()
export class MedicalTimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async buildForPlayer(input: {
    playerId: string;
    tenantId: string;
    limit?: number;
  }): Promise<MedicalTimelineItem[]> {
    const limit = input.limit ?? 80;
    const playerId = input.playerId;
    const tenantId = input.tenantId;

    const [
      encounters,
      nursing,
      physio,
      transitions,
      departures,
      hydrations,
      assessments,
    ] = await Promise.all([
      this.prisma.medicalEncounter.findMany({
        where: { playerId, tenantId, status: { not: 'cancelled' } },
        orderBy: { occurredAt: 'desc' },
        take: limit,
        select: {
          id: true,
          occurredAt: true,
          diagnosis: true,
          chiefComplaint: true,
          anamnesis: true,
          evolutionNotes: true,
        },
      }),
      this.prisma.nursingSession.findMany({
        where: { playerId, tenantId },
        orderBy: { attendedAt: 'desc' },
        take: limit,
        include: {
          sessionDiagnoses: { orderBy: { sortOrder: 'asc' }, take: 3 },
        },
      }),
      this.prisma.physioSession.findMany({
        where: { playerId, tenantId },
        orderBy: { startedAt: 'desc' },
        take: limit,
        include: { region: { select: { namePt: true } } },
      }),
      this.prisma.physioTransitionProgram.findMany({
        where: { playerId, tenantId },
        orderBy: { startedAt: 'desc' },
        take: limit,
        include: {
          originSession: {
            select: {
              diagnosisLabel: true,
              region: { select: { namePt: true } },
            },
          },
          entries: { orderBy: [{ sessionDate: 'desc' }], take: 1 },
        },
      }),
      this.prisma.playerMedicalDeparture.findMany({
        where: { playerId, tenantId },
        orderBy: { departedAt: 'desc' },
        take: limit,
      }),
      this.prisma.physiologyHydration.findMany({
        where: {
          playerId,
          tenantId,
          status: { in: ['desidratado', 'severo'] },
        },
        orderBy: { recordedAt: 'desc' },
        take: 15,
      }),
      this.prisma.physiologyAssessment.findMany({
        where: {
          playerId,
          tenantId,
          OR: [
            { assessmentType: 'entrada' },
            { mobilityNotes: { not: null } },
            { compositionStatus: { in: ['acima', 'abaixo'] } },
          ],
        },
        orderBy: { assessedAt: 'desc' },
        take: 15,
      }),
    ]);

    const items: MedicalTimelineItem[] = [];

    for (const e of encounters) {
      items.push({
        id: `enc-${e.id}`,
        sourceType: 'medical_encounter',
        sourceId: e.id,
        occurredAt: isoDateTime(e.occurredAt),
        title: e.diagnosis?.trim()
          ? `Atendimento médico — ${e.diagnosis.trim().slice(0, 80)}`
          : 'Atendimento médico',
        summary: excerpt(e.chiefComplaint ?? e.anamnesis),
        readOnly: false,
      });
      const evo = Array.isArray((e as { evolutionNotes?: unknown }).evolutionNotes)
        ? ((e as { evolutionNotes: MedicalEvolutionNote[] }).evolutionNotes ?? [])
        : [];
      for (const n of evo) {
        if (!n?.note?.trim()) continue;
        items.push({
          id: `enc-evo-${e.id}-${n.at}`,
          sourceType: 'medical_evolution',
          sourceId: e.id,
          occurredAt: n.at || isoDateTime(e.occurredAt),
          title: 'Evolução médica',
          summary: excerpt(n.note),
          readOnly: false,
        });
      }
    }

    for (const n of nursing) {
      const dx =
        n.sessionDiagnoses.map((d) => d.diagnosisLabel).filter(Boolean).join(', ') ||
        'Enfermaria';
      items.push({
        id: `nur-${n.id}`,
        sourceType: 'nursing_session',
        sourceId: n.id,
        occurredAt: isoDateTime(n.attendedAt),
        title: `Enfermaria — ${dx}`,
        summary: excerpt(
          [
            n.symptoms,
            n.exemptFromTraining ? 'Isento do treino' : null,
            n.status === 'active' ? 'Em aberto' : null,
          ]
            .filter(Boolean)
            .join(' · '),
        ),
        readOnly: true,
      });
    }

    for (const s of physio) {
      const region = s.region?.namePt ?? 'Fisioterapia';
      items.push({
        id: `phy-${s.id}`,
        sourceType: 'physio_session',
        sourceId: s.id,
        occurredAt: isoDateTime(s.startedAt),
        title: `Fisioterapia — ${region}${s.diagnosisLabel ? ` · ${s.diagnosisLabel}` : ''}`,
        summary: excerpt(
          [s.disposition, s.status !== 'active' ? s.status : null, s.symptoms]
            .filter(Boolean)
            .join(' · '),
        ),
        readOnly: true,
      });
    }

    for (const p of transitions) {
      const origin = p.originSession;
      const latest = p.entries[0];
      items.push({
        id: `tr-${p.id}`,
        sourceType: 'physio_transition',
        sourceId: p.id,
        occurredAt: isoDateTime(latest?.createdAt ?? p.startedAt),
        title: `Transição / RTP — ${origin?.region?.namePt ?? 'Programa'}`,
        summary: excerpt(
          [
            p.status,
            origin?.diagnosisLabel,
            latest?.sessionDate ? `Última sessão ${latest.sessionDate}` : null,
            latest?.stillFeelsPain ? 'Relata dor' : null,
          ]
            .filter(Boolean)
            .join(' · '),
        ),
        readOnly: true,
      });
    }

    for (const d of departures) {
      items.push({
        id: `dep-${d.id}`,
        sourceType: 'medical_departure',
        sourceId: d.id,
        occurredAt: isoDateTime(d.departedAt),
        title: `Saída do CT — ${d.careType}`,
        summary: excerpt(d.reason),
        readOnly: true,
      });
    }

    for (const h of hydrations) {
      items.push({
        id: `hyd-${h.id}`,
        sourceType: 'physiology_clinical',
        sourceId: h.id,
        occurredAt: isoDateTime(h.recordedAt),
        title: `Hidratação — ${h.status ?? h.contextType}`,
        summary: excerpt(h.notes),
        readOnly: true,
      });
    }

    for (const a of assessments) {
      items.push({
        id: `ass-${a.id}`,
        sourceType: 'physiology_clinical',
        sourceId: a.id,
        occurredAt: isoDateTime(a.assessedAt),
        title: `Avaliação física${a.assessmentType === 'entrada' ? ' (entrada)' : ''}`,
        summary: excerpt(
          [a.compositionStatus, a.mobilityNotes, a.notes].filter(Boolean).join(' · '),
        ),
        readOnly: true,
      });
    }

    items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return items.slice(0, limit);
  }
}
