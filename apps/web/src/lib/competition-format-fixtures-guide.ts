import type { CampeonatoFormat, CompetitionFormat, CopaFormat, TorneioFormat } from "@/lib/competition-formats";
import { FORMAT_OPTIONS, emptyFormat } from "@/lib/competition-formats";

/** Interpreta JSON salvo no evento como CompetitionFormat válido. */
export function parseCompetitionFormat(raw: unknown): CompetitionFormat | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const ft = o.formatType;
  if (ft !== "campeonato" && ft !== "copa" && ft !== "torneio") return null;
  const base = emptyFormat(ft);
  const clubsRaw = Number(o.clubsCount);
  const clubsCount = Number.isFinite(clubsRaw) && clubsRaw >= 2 ? Math.min(256, clubsRaw) : base.clubsCount;
  const merged = { ...base, ...o, formatType: ft, clubsCount } as CompetitionFormat;
  if (ft === "copa" || ft === "torneio") {
    const m = merged as CopaFormat | TorneioFormat;
    const b = base as CopaFormat | TorneioFormat;
    if (!Array.isArray(m.phases) || m.phases.length === 0) {
      m.phases = b.phases;
    }
  }
  return merged;
}

function isPowerOfTwo(n: number): boolean {
  return n >= 2 && Number.isInteger(Math.log2(n));
}

/**
 * Textos para orientar cadastro de jogos (manual/planilha) alinhado ao formato da disputa.
 */
export function getCompetitionFormatFixturesGuideLines(format: CompetitionFormat): string[] {
  const n = format.clubsCount ?? 8;
  const lines: string[] = [];
  const typeLabel = FORMAT_OPTIONS.find((f) => f.value === format.formatType)?.label ?? format.formatType;
  lines.push(`Participantes: ${n} clubes · ${typeLabel}.`);

  if (format.formatType === "campeonato") {
    const c = format as CampeonatoFormat;
    const jogosIda = (n * (n - 1)) / 2;
    lines.push(
      c.turnoReturno
        ? `Pontos corridos com turno e returno: até ${jogosIda * 2} jogos no total (ida e volta).`
        : `Pontos corridos (todos contra todos, ida só): ${jogosIda} jogos.`,
    );
    lines.push(
      "Cadastre cada confronto na lista manual ou na planilha. Na página do evento, a competição exibida é o nome do evento (sem campo Competição no editor).",
    );
  }

  if (format.formatType === "copa") {
    const c = format as CopaFormat;
    const phases = c.phases ?? [];
    if (phases.length > 0) {
      lines.push(
        "Fases configuradas no cadastro — alinhe a ordem dos jogos e, se quiser, títulos de seção na página; na página do evento não há campo Competição (o contexto é o próprio evento).",
      );
      for (const p of phases) {
        const modo =
          p.formato === "eliminatoria"
            ? "eliminatória"
            : p.formato === "jogo_unico"
              ? "jogo único"
              : p.formato === "grupos"
                ? "grupos"
                : "todos contra todos";
        lines.push(`· ${p.nome} (${modo})`);
      }
    }
    if (isPowerOfTwo(n)) {
      const rounds = Math.log2(n);
      const firstRoundPairs = n / 2;
      lines.push(
        `Mata-mata clássico com ${n} equipes: ${rounds} rodadas eliminatórias; a 1ª rodada tem ${firstRoundPairs} confronto(s) (ida/volta conforme regras).`,
      );
    } else {
      lines.push(
        `Com ${n} equipes o chaveamento pode incluir repescagem ou byes — siga as fases definidas acima no cadastro.`,
      );
    }
  }

  if (format.formatType === "torneio") {
    const t = format as TorneioFormat;
    const ng = t.numGroups ?? 0;
    const cp = t.clubsPerGroup ?? 0;
    const vz = t.vagasPorGrupo ?? 0;
    if (t.faseGrupos && ng > 0 && cp > 0) {
      lines.push(
        `Fase de grupos: ${ng} grupo(s), ~${cp} clubes por grupo; ${vz} vaga(s) por grupo para a fase eliminatória (se configurado).`,
      );
    }
    const phases = t.phases ?? [];
    if (phases.length > 0) {
      lines.push("Fases:");
      for (const p of phases) {
        lines.push(`· ${p.nome}`);
      }
    }
  }

  lines.push(
    "O filtro Categoria (Principal, Sub-20…) é faixa etária. Na página de clube, use Competição para o campeonato (ex.: Paulista). Na página do evento, a competição exibida no card é o próprio nome do evento — use títulos de seção ou blocos extras se quiser destacar fases (Quartas, Final).",
  );

  return lines;
}
