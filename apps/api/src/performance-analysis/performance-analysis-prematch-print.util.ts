import {
  PRE_MATCH_SECTION_KEYS,
  PRE_MATCH_SECTION_LABELS,
} from './performance-analysis-workflows.constants';
import { wrapPrintRootDocument, DEFAULT_REPORT_PRINT_CONFIG } from '@bcg/player-dossier-print';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPreMatchPrintHtml(input: {
  preparation: {
    title: string;
    opponentName?: string | null;
    matchDate?: string | null;
    category?: string | null;
    travelLogistics?: {
      opponentName?: string | null;
      championshipName?: string | null;
      stadiumName?: string | null;
      isHomeMatch?: boolean;
    } | null;
  };
  version: {
    lifecycle: string;
    versionNumber: number;
    sections?: unknown;
    hiddenSections?: unknown;
    analystNotes?: string | null;
    staffNotes?: string | null;
    tacticalBoard?: unknown;
    selectedClipIds?: unknown;
  };
  profileBundle?: {
    profile: { opponentName: string; strengths?: unknown; weaknesses?: unknown };
    lineups?: Array<{ formation?: string | null; entries: Array<{ name: string; shirtNumber?: number | null; position?: string | null }> }>;
    players?: Array<{ name: string; tacticalRole?: string | null; observations?: string | null }>;
  } | null;
}): string {
  const hidden = new Set(
    Array.isArray(input.version.hiddenSections)
      ? (input.version.hiddenSections as string[])
      : [],
  );
  const sectionsObj =
    input.version.sections && typeof input.version.sections === 'object'
      ? (input.version.sections as Record<string, { text?: string; html?: string }>)
      : {};

  const cover = `<div style="padding:24px">
    <h1 style="font-size:22px;margin:0 0 8px">${escapeHtml(input.preparation.title)}</h1>
    <p style="color:#64748b;font-size:12px">Versão ${input.version.versionNumber} · ${escapeHtml(input.version.lifecycle)}</p>
    <p>${escapeHtml(input.preparation.matchDate ?? '—')} · ${escapeHtml(input.preparation.category ?? '—')} · ${escapeHtml(input.preparation.opponentName ?? input.preparation.travelLogistics?.opponentName ?? '—')}</p>
  </div>`;

  const blocks: string[] = [];
  for (const key of PRE_MATCH_SECTION_KEYS) {
    if (hidden.has(key)) continue;
    const label = PRE_MATCH_SECTION_LABELS[key];
    const sec = sectionsObj[key];
    const body = sec?.text?.trim() || sec?.html?.trim() || '';
    if (!body && key !== 'formacao_provavel' && key !== 'jogadores_chave') continue;
    blocks.push(
      `<section style="margin-bottom:20px;break-inside:avoid"><h2 style="font-size:14px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">${escapeHtml(label)}</h2><div class="prose" style="font-size:11px">${escapeHtml(body)}</div></section>`,
    );
  }

  if (input.profileBundle?.lineups?.[0]) {
    const lu = input.profileBundle.lineups[0];
    const rows = lu.entries
      .map(
        (e) =>
          `<tr><td>${escapeHtml(String(e.shirtNumber ?? '—'))}</td><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.position ?? '—')}</td></tr>`,
      )
      .join('');
    blocks.push(
      `<section><h2>Formação provável</h2><p>${escapeHtml(lu.formation ?? '—')}</p><table style="width:100%;font-size:10px;border-collapse:collapse">${rows}</table></section>`,
    );
  }

  if (input.version.analystNotes?.trim()) {
    blocks.push(
      `<section><h2>Notas do analista</h2><p>${escapeHtml(input.version.analystNotes.trim())}</p></section>`,
    );
  }
  if (input.version.staffNotes?.trim()) {
    blocks.push(
      `<section><h2>Comissão</h2><p>${escapeHtml(input.version.staffNotes.trim())}</p></section>`,
    );
  }

  const clipIds = Array.isArray(input.version.selectedClipIds)
    ? (input.version.selectedClipIds as string[])
    : [];
  if (clipIds.length > 0) {
    blocks.push(
      `<section><h2>Clips referenciados</h2><p style="font-size:10px;color:#64748b">${clipIds.length} clip(s) — reprodução apenas no CUP360 autenticado.</p></section>`,
    );
  }

  const bodyHtml = blocks.join('');
  return wrapPrintRootDocument({
    title: input.preparation.title,
    config: DEFAULT_REPORT_PRINT_CONFIG,
    styles: '',
    coverHtml: cover,
    headerHtml: '',
    metaHtml: '',
    bodyHtml,
    footerHtml: '<div style="font-size:9px;color:#64748b">Pré-jogo CUP360 · documento interno</div>',
  });
}
