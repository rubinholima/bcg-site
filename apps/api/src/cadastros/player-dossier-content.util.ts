type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isoDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

const PSYCH_FIELD_LABELS: Record<string, string> = {
  objetivoPrincipal: 'Objetivo principal',
  observacaoGeral: 'Observação geral',
  individualNotes: 'Notas individuais',
  groupSummary: 'Resumo do grupo',
  observacoes: 'Observações',
  historicoEsportivo: 'Histórico esportivo',
  motivacaoObjetivos: 'Motivação e objetivos',
  ansiedadeEstresse: 'Ansiedade e estresse',
  concentracaoFoco: 'Concentração e foco',
  autoconfianca: 'Autoconfiança',
  coping: 'Estratégias de coping',
  relacoesInterpessoais: 'Relações interpessoais',
  vidaForaEsporte: 'Vida fora do esporte',
  qualidadeVida: 'Qualidade de vida',
  preparacaoCompeticao: 'Preparação para competição',
  ansiedadeNervosismo: 'Ansiedade / nervosismo',
  estrategiaMental: 'Estratégia mental',
  pressaoJogo: 'Pressão no jogo',
  reacaoAposErros: 'Reação após erros',
  historicoLesoes: 'Histórico de lesões',
  torneiosRecentes: 'Competições recentes',
  escalaConfianca1a5: 'Confiança (1–5)',
};

const PSYCH_KIND_LABELS: Record<string, string> = {
  anamnese: 'Anamnese',
  atendimento_grupo: 'Atendimento em grupo',
  atendimento_presencial: 'Atendimento presencial',
  relatorio_semanal: 'Relatório semanal',
};

export function psychKindLabel(kind?: string | null): string {
  if (!kind) return 'Avaliação psicológica';
  return PSYCH_KIND_LABELS[kind] ?? kind;
}

export function normalizePsychologyRecords(raw: unknown) {
  return asArray(raw)
    .map((entry) => {
      const o = asObject(entry);
      const data = asObject(o.data);
      const merged = { ...data, ...o };
      const observations: Array<{ label: string; text: string }> = [];

      for (const [key, label] of Object.entries(PSYCH_FIELD_LABELS)) {
        const text = str(merged[key]);
        if (text) observations.push({ label, text });
      }

      if (o.present === true) observations.push({ label: 'Presença', text: 'Presente' });
      else if (o.present === false) observations.push({ label: 'Presença', text: 'Ausente' });

      const category = str(o.category);
      if (category) observations.push({ label: 'Categoria', text: category });

      const supervisor = str(o.supervisor);
      if (supervisor) observations.push({ label: 'Supervisão', text: supervisor });

      const estagiario = str(o.estagiario);
      if (estagiario) observations.push({ label: 'Estagiário(a)', text: estagiario });

      const summary =
        str(o.groupSummary) ??
        str(o.individualNotes) ??
        str(o.observacaoGeral) ??
        str(o.observacoes) ??
        observations[0]?.text ??
        null;

      if (observations.length === 0 && !summary && !str(o.date)) return null;

      return {
        date: str(o.date) ?? '',
        kind: psychKindLabel(str(o.kind)),
        evaluator: str(o.evaluator) ?? str(o.supervisor) ?? null,
        present: o.present === true ? true : o.present === false ? false : null,
        summary,
        observations,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);
}

export function buildHighlightItems(input: {
  highlights: unknown;
  images: unknown;
}) {
  const items: Array<{ kind: 'video' | 'image' | 'link'; url: string; label: string }> = [];

  for (const url of asArray(input.highlights)) {
    const u = str(url);
    if (!u) continue;
    const lower = u.toLowerCase();
    const kind =
      lower.includes('youtube') || lower.includes('youtu.be') || lower.includes('vimeo')
        ? 'video'
        : lower.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/)
          ? 'image'
          : 'link';
    items.push({ kind, url: u, label: kind === 'video' ? 'Vídeo destaque' : 'Destaque' });
  }

  for (const img of asArray(input.images)) {
    const o = asObject(img);
    const u = str(o.url);
    if (!u) continue;
    items.push({
      kind: 'image',
      url: u,
      label: str(o.type) ?? str(o.caption) ?? 'Imagem',
    });
  }

  return items;
}

export function buildSportingStory(input: {
  previousTeams: string[];
  seasonHistory: unknown;
  subidaEvents: unknown;
  movements: Array<{ date: string; label: string; detail?: string | null }>;
  currentTeam?: string | null;
  category?: string | null;
}) {
  const milestones: Array<{ date: string; type: string; title: string; detail?: string | null }> = [];

  if (input.currentTeam?.trim()) {
    milestones.push({
      date: '',
      type: 'Clube atual',
      title: input.currentTeam.trim(),
      detail: input.category ? `Categoria ${input.category}` : null,
    });
  }

  for (const team of input.previousTeams) {
    milestones.push({
      date: '',
      type: 'Clube anterior',
      title: team,
      detail: null,
    });
  }

  for (const row of asArray(input.seasonHistory)) {
    const o = asObject(row);
    const date =
      str(o.season) ?? str(o.year) ?? (typeof o.year === 'number' ? String(o.year) : '') ?? '';
    const club = str(o.club) ?? str(o.team);
    const cat = str(o.category);
    if (club || cat) {
      milestones.push({
        date,
        type: 'Temporada',
        title: club ?? 'Registro de temporada',
        detail: cat ? `Categoria ${cat}` : null,
      });
    }
  }

  for (const ev of asArray(input.subidaEvents)) {
    const o = asObject(ev);
    milestones.push({
      date: isoDate(o.matchDate as Date | string),
      type: 'Convocação / subida',
      title: str(o.agendaTitle) ?? 'Subida de categoria',
      detail: Array.isArray(o.eventCategories)
        ? (o.eventCategories as string[]).join(', ')
        : str(o.category),
    });
  }

  for (const m of input.movements) {
    if (milestones.some((x) => x.title === m.label && x.date === m.date)) continue;
    milestones.push({
      date: m.date,
      type: 'Movimentação',
      title: m.label,
      detail: m.detail,
    });
  }

  milestones.sort((a, b) => (b.date || '0000').localeCompare(a.date || '0000'));
  return milestones;
}

export function buildMonthlyGoalsChart(
  matches: Array<{ played: boolean; goals: number; match: { matchDate: Date | string } }>,
) {
  const byMonth = new Map<string, { goals: number; games: number }>();
  for (const row of matches) {
    if (!row.played) continue;
    const date =
      row.match.matchDate instanceof Date ? row.match.matchDate : new Date(row.match.matchDate);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const cur = byMonth.get(key) ?? { goals: 0, games: 0 };
    cur.goals += row.goals ?? 0;
    cur.games += 1;
    byMonth.set(key, cur);
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([label, v]) => ({ label, goals: v.goals, games: v.games }));
}

export function buildMonthlyAppearancesChart(
  matches: Array<{ played: boolean; starter: boolean; match: { matchDate: Date | string } }>,
) {
  const byMonth = new Map<string, { appearances: number; starts: number }>();
  for (const row of matches) {
    if (!row.played) continue;
    const date =
      row.match.matchDate instanceof Date ? row.match.matchDate : new Date(row.match.matchDate);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const cur = byMonth.get(key) ?? { appearances: 0, starts: 0 };
    cur.appearances += 1;
    if (row.starter) cur.starts += 1;
    byMonth.set(key, cur);
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([label, v]) => ({ label, appearances: v.appearances, starts: v.starts }));
}

export function resolveAssists(input: {
  profileAssists?: number | null;
  coachEvaluations: Array<{ assists: number }>;
}): number | null {
  if (typeof input.profileAssists === 'number' && Number.isFinite(input.profileAssists)) {
    return input.profileAssists;
  }
  const fromCoach = input.coachEvaluations.reduce((sum, r) => sum + (r.assists ?? 0), 0);
  return fromCoach > 0 ? fromCoach : null;
}

export function flattenEvolutionNotes(raw: unknown): string | null {
  const notes = asArray(raw);
  const texts = notes
    .map((n) => {
      const o = asObject(n);
      return str(o.note) ?? str(o.text) ?? str(o.content);
    })
    .filter(Boolean) as string[];
  return texts.length > 0 ? texts.join(' · ') : null;
}
