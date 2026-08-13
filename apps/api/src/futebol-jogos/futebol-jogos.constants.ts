export const MATCH_INCIDENT_KINDS = [
  'atraso',
  'briga',
  'disciplina',
  'observacao',
  'acrescimo',
  'outro',
] as const;

export type MatchIncidentKind = (typeof MATCH_INCIDENT_KINDS)[number];

export const MATCH_INCIDENT_KIND_LABELS: Record<MatchIncidentKind, string> = {
  atraso: 'Atraso',
  briga: 'Briga / confusão',
  disciplina: 'Disciplina',
  observacao: 'Observação',
  acrescimo: 'Acréscimo',
  outro: 'Outro',
};

export const MATCH_ATTACHMENT_KINDS = [
  'sumula',
  'correcao',
  'documento',
  'outro',
] as const;

export type MatchAttachmentKind = (typeof MATCH_ATTACHMENT_KINDS)[number];

export const MATCH_ATTACHMENT_KIND_LABELS: Record<MatchAttachmentKind, string> = {
  sumula: 'Súmula',
  correcao: 'Correção',
  documento: 'Documento',
  outro: 'Outro',
};

export function normalizeIncidentKind(value: unknown): MatchIncidentKind {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (MATCH_INCIDENT_KINDS as readonly string[]).includes(raw)
    ? (raw as MatchIncidentKind)
    : 'outro';
}

export function normalizeAttachmentKind(value: unknown): MatchAttachmentKind {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (MATCH_ATTACHMENT_KINDS as readonly string[]).includes(raw)
    ? (raw as MatchAttachmentKind)
    : 'outro';
}
