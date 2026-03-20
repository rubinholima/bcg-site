"use client";

import { useState, useMemo, useEffect } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import type { TabelaStandingsRow } from "@/types/home-content";
import type { Page } from "@/types/page";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { SmartImage } from "@/components/common/SmartImage";
import { getPublicImageUrl } from "@/lib/media-url";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, RotateCcw } from "lucide-react";
import { getCategoryLabel } from "@/lib/fixture-categories";

const DEFAULT_STANDINGS_FORMULA = "pontos:desc,saldo_gols:desc,gols_marcados:desc,vitorias:desc";

type ChampionshipInfo = { name: string; logoUrl?: string | null; standingsFormula?: string | null };

function parseStandingsFormula(formula: string): Array<{ field: keyof TabelaStandingsRow; dir: "asc" | "desc" }> {
  const parts = formula.trim().split(",").filter(Boolean);
  const fieldMap: Record<string, keyof TabelaStandingsRow> = {
    pontos: "pontos",
    saldo_gols: "saldoGols",
    gols_marcados: "golsMarcados",
    gols_sofridos: "golsSofridos",
    vitorias: "vitorias",
    empates: "empates",
    derrotas: "derrotas",
    jogos: "jogos",
  };
  return parts.map((p) => {
    const [f, d] = p.split(":").map((s) => s.trim().toLowerCase());
    const field = fieldMap[f] ?? "pontos";
    const dir = d === "asc" ? "asc" : "desc";
    return { field, dir };
  });
}

function sortByFormula(rows: TabelaStandingsRow[], formula: string): TabelaStandingsRow[] {
  const rules = parseStandingsFormula(formula || DEFAULT_STANDINGS_FORMULA);
  return [...rows].sort((a, b) => {
    for (const { field, dir } of rules) {
      const va = (a[field] as number) ?? 0;
      const vb = (b[field] as number) ?? 0;
      if (va !== vb) {
        return dir === "desc" ? vb - va : va - vb;
      }
    }
    return (a.time ?? "").localeCompare(b.time ?? "");
  });
}

/** Coleta todos os blocos da página (incluindo aninhados em sections). */
function collectAllBlocks(blocks: HomeContentBlock[] | undefined): HomeContentBlock[] {
  if (!blocks?.length) return [];
  const out: HomeContentBlock[] = [];
  for (const b of blocks) {
    out.push(b);
    if (b.type === "section") {
      const left = (b.config?.sectionLeftModules as HomeContentBlock[] | undefined) ?? [];
      const right = (b.config?.sectionRightModules as HomeContentBlock[] | undefined) ?? [];
      out.push(...collectAllBlocks(left), ...collectAllBlocks(right));
    }
  }
  return out;
}

/** Busca dados de tabela de outro bloco tabela na página (quando este está vazio). */
function findTabelaRowsFromPage(page: Page | undefined, excludeBlockId: string): TabelaStandingsRow[] {
  if (!page?.content?.blocks?.length) return [];
  const all = collectAllBlocks(page.content.blocks);
  const tabela = all.find(
    (b) =>
      (b.type === "tabela" || b.type === "tabela_eventos") &&
      b.id !== excludeBlockId &&
      ((b.config?.tabelaManualRows as TabelaStandingsRow[]) ?? []).length > 0
  );
  return (tabela?.config?.tabelaManualRows as TabelaStandingsRow[]) ?? [];
}

const OUR_CLUB_PLACEHOLDERS = ["nosso clube", "our club"];

export function TabelaClassificacaoSection({
  block,
  page,
  lang,
  ourTeamName,
  ourTeamLogoUrl,
  fullWidth,
  titleAlign,
  inSection,
  sectionColumns,
  showTitle = true,
}: {
  block: HomeContentBlock;
  page?: Page;
  lang: "pt" | "en";
  ourTeamName?: string | null;
  ourTeamLogoUrl?: string | null;
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
  inSection?: boolean;
  sectionColumns?: 1 | 2 | 3;
  showTitle?: boolean;
}) {
  const ownRows = (block.config?.tabelaManualRows as TabelaStandingsRow[] | undefined) ?? [];
  const fallbackRows = useMemo(() => (ownRows.length === 0 ? findTabelaRowsFromPage(page, block.id) : []), [page, block.id, ownRows.length]);
  const rows = ownRows.length > 0 ? ownRows : fallbackRows;
  const bgColor = (block.config?.backgroundColor as string)?.trim() || "#18181b";
  const overlayOpacity = typeof block.config?.backgroundOverlayOpacity === "number"
    ? block.config.backgroundOverlayOpacity
    : 0.75;
  const bgImage = (block.config?.backgroundImage as string)?.trim();

  const competicoes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const v = (r.competicao ?? r.categoria)?.trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [rows]);

  const categorias = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.categoria?.trim() && set.add(r.categoria.trim()));
    return Array.from(set).sort();
  }, [rows]);

  const temporadas = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.temporada?.trim() && set.add(r.temporada.trim()));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const [competicaoSel, setCompeticaoSel] = useState<string>(competicoes[0] ?? "");
  const [categoriaSel, setCategoriaSel] = useState<string>(categorias[0] ?? "");
  const [temporadaSel, setTemporadaSel] = useState<string>(temporadas[0] ?? "");
  const [championships, setChampionships] = useState<ChampionshipInfo[]>([]);

  useEffect(() => {
    fetch("/api/public/cadastros/championships")
      .then((r) => r.json())
      .then((data) => {
        const items = data?.items ?? (Array.isArray(data) ? data : []);
        setChampionships(Array.isArray(items) ? items : []);
      })
      .catch(() => setChampionships([]));
  }, []);

  const championshipByCompeticao = useMemo(() => {
    const map = new Map<string, ChampionshipInfo>();
    championships.forEach((c) => map.set(c.name.trim(), c));
    return map;
  }, [championships]);

  const filteredAndSortedRows = useMemo(() => {
    const filtered = rows.filter((r) => {
      const compOk = !competicaoSel || (r.competicao ?? r.categoria)?.trim() === competicaoSel;
      const catOk = !categoriaSel || r.categoria?.trim() === categoriaSel;
      const tempOk = !temporadaSel || r.temporada?.trim() === temporadaSel;
      return compOk && catOk && tempOk;
    });
    const champ = championshipByCompeticao.get(competicaoSel);
    const formula = champ?.standingsFormula ?? DEFAULT_STANDINGS_FORMULA;
    const sorted = sortByFormula(filtered, formula);
    return sorted.map((r, i) => ({ ...r, posicao: i + 1, variacao: "same" as const }));
  }, [rows, competicaoSel, categoriaSel, temporadaSel, championshipByCompeticao]);

  const handleReset = () => {
    setCompeticaoSel(competicoes[0] ?? "");
    setCategoriaSel(categorias[0] ?? "");
    setTemporadaSel(temporadas[0] ?? "");
  };

  const title = lang === "pt"
    ? ((block.config?.titlePt as string)?.trim() || "Classificação")
    : ((block.config?.titleEn as string)?.trim() || "Standings");

  const containerClass = fullWidth ? "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" : "container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

  /** sectionSize (minimal/compact/normal/large) — só afeta quando inSection. Minimal = máximo compacto. */
  const sectionSize = (block.config?.sectionSize as "minimal" | "compact" | "normal" | "large") || "normal";
  const density: "minimal" | "compact" | "normal" | "large" = inSection ? sectionSize : "normal";

  /** Seção em 3 colunas: tabela compacta, fontes menores, barra sem overflow. */
  const is3Col = Boolean(inSection && sectionColumns === 3);

  return (
    <section
      className={`relative overflow-hidden ${inSection ? "" : "border-b border-white/5"}`}
      style={inSection ? undefined : (bgColor ? { backgroundColor: bgColor } : undefined)}
    >
      {!inSection && bgImage && (
        <>
          <div className="absolute inset-0">
            <SmartImage
              src={getPublicImageUrl(bgImage)}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
          </div>
        </>
      )}
      <div
        className={`relative ${
          inSection
            ? density === "minimal" || density === "compact"
              ? density === "minimal"
                ? "py-1 sm:py-2"
                : "py-2 sm:py-3"
              : density === "large"
                ? "py-6 sm:py-8"
                : "py-4 sm:py-6"
            : "py-12 sm:py-16"
        }`}
      >
        <div className={containerClass}>
          {showTitle && title && (
            <SectionTitle
              title={title}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
              align={titleAlign ?? "left"}
            />
          )}

          {rows.length === 0 ? (
            <div className="mt-8 rounded-xl border border-white/10 bg-zinc-900/50 px-6 py-12 text-center text-zinc-500">
              {lang === "pt"
                ? "Nenhum dado de classificação. Configure a planilha ou adicione linhas manualmente no editor."
                : "No standings data. Configure the spreadsheet or add rows manually in the editor."}
            </div>
          ) : (
            <>
              {/* Barra de filtros — em 3 col: fontes menores, min-w-0 para evitar overflow */}
              <div
                className={`flex min-w-0 flex-nowrap items-center justify-between gap-1 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/80 ${
                  is3Col
                    ? "mt-2 gap-0.5 px-1.5 py-1 sm:px-2"
                    : inSection && (density === "minimal" || density === "compact")
                      ? density === "minimal"
                        ? "mt-1 gap-1 px-1.5 py-1 sm:rounded-md sm:px-2"
                        : "mt-2 gap-2 px-2 py-1.5 sm:rounded-lg sm:px-3"
                    : inSection && density === "large"
                      ? "mt-8 gap-6 px-5 py-3.5 sm:rounded-2xl sm:px-6"
                      : "mt-6 gap-4 px-4 py-2.5 sm:rounded-2xl sm:px-6"
                }`}
              >
                <div
                  className={`flex shrink-0 items-center rounded-l-lg bg-zinc-800/80 ${
                    is3Col
                      ? "gap-0.5 px-1 py-0.5"
                      : inSection && (density === "minimal" || density === "compact")
                        ? density === "minimal"
                          ? "gap-0.5 px-1 py-0.5 sm:rounded-l-sm"
                          : "gap-1 px-1.5 py-1 sm:rounded-l-md"
                        : "gap-1.5 px-2 py-1.5 sm:rounded-l-xl"
                  }`}
                >
                  <Filter className={is3Col ? "h-3 w-3 text-white" : "h-3.5 w-3.5 text-white"} />
                  <span className={is3Col ? "text-[8px] font-semibold uppercase tracking-wider text-white" : "text-[10px] font-semibold uppercase tracking-wider text-white sm:text-xs"}>
                    {lang === "pt" ? "Filtro" : "Filter"}
                  </span>
                </div>
                {competicoes.length > 0 && (
                  <div className="flex min-w-0 shrink items-center gap-0.5">
                    {!is3Col && (
                      <label className="hidden text-[10px] font-medium uppercase tracking-wider text-zinc-400 sm:inline">
                        {lang === "pt" ? "Competições" : "Competitions"}
                      </label>
                    )}
                    <Select value={competicaoSel} onValueChange={setCompeticaoSel}>
                      <SelectTrigger className={`border-white/10 bg-zinc-800/60 px-1.5 text-white focus:ring-amber-500/30 ${is3Col ? "h-5 w-[72px] min-w-0 text-[9px]" : "h-7 w-[100px] px-2 text-xs sm:w-[110px]"}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {competicoes.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {categorias.length > 0 && (
                  <div className="flex min-w-0 shrink items-center gap-0.5">
                    {!is3Col && (
                      <label className="hidden text-[10px] font-medium uppercase tracking-wider text-zinc-400 sm:inline">
                        {lang === "pt" ? "Categoria" : "Category"}
                      </label>
                    )}
                    <Select value={categoriaSel} onValueChange={setCategoriaSel}>
                      <SelectTrigger className={`border-white/10 bg-zinc-800/60 px-1.5 text-white focus:ring-amber-500/30 ${is3Col ? "h-5 w-[64px] min-w-0 text-[9px]" : "h-7 w-[90px] px-2 text-xs sm:w-[100px]"}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((c) => (
                          <SelectItem key={c} value={c}>
                            {getCategoryLabel(c, lang)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {temporadas.length > 0 && (
                  <div className="flex min-w-0 shrink items-center gap-0.5">
                    {!is3Col && (
                      <label className="hidden text-[10px] font-medium uppercase tracking-wider text-zinc-400 sm:inline">
                        {lang === "pt" ? "Temporada" : "Season"}
                      </label>
                    )}
                    <Select value={temporadaSel} onValueChange={setTemporadaSel}>
                      <SelectTrigger className={`border-white/10 bg-zinc-800/60 px-1.5 text-white focus:ring-amber-500/30 ${is3Col ? "h-5 w-[52px] min-w-0 text-[9px]" : "h-7 w-[70px] px-2 text-xs sm:w-[80px]"}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {temporadas.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className={`flex shrink-0 items-center rounded-r-lg bg-zinc-800/80 text-amber-400 transition-colors hover:bg-zinc-700/80 hover:text-amber-300 ${
                    is3Col
                      ? "gap-0.5 px-1 py-0.5"
                      : inSection && (density === "minimal" || density === "compact")
                        ? density === "minimal"
                          ? "gap-0.5 px-1 py-0.5 sm:rounded-r-sm"
                          : "gap-1 px-1.5 py-1 sm:rounded-r-md"
                        : "gap-1.5 px-2 py-1.5 sm:rounded-r-xl"
                  }`}
                  aria-label={lang === "pt" ? "Resetar filtros" : "Reset filters"}
                >
                  <RotateCcw className={is3Col ? "h-3 w-3" : "h-3.5 w-3.5"} />
                  <span className={is3Col ? "text-[8px] font-semibold uppercase tracking-wider" : "text-[10px] font-semibold uppercase tracking-wider sm:text-xs"}>
                    {lang === "pt" ? "Reset" : "Reset"}
                  </span>
                </button>
              </div>

              {/* Tabela — em 3 col: max 4 clubes visíveis, restante na rolagem; fonte legível; 2 col inalterado */}
              <div
                className={`w-full rounded-xl border border-white/10 bg-zinc-900/60 ${
                  is3Col
                    ? "mt-2 max-h-[260px] overflow-y-auto overflow-x-hidden rounded-lg"
                    : inSection
                      ? density === "minimal"
                        ? "mt-1 max-h-[180px] overflow-auto rounded-lg"
                        : density === "compact"
                          ? "mt-2 max-h-[200px] overflow-auto rounded-lg"
                          : density === "large"
                            ? "mt-8 max-h-[260px] overflow-auto"
                            : "mt-6 max-h-[220px] overflow-auto"
                      : "mt-6 overflow-x-auto"
                }`}
              >
                <table className={`w-full text-left ${is3Col ? "min-w-0 table-fixed text-xs" : inSection ? "min-w-0 table-fixed" : "min-w-[800px]"} ${!is3Col && (inSection && (density === "minimal" || density === "compact") ? "text-xs" : "text-sm")}`}>
                  <thead>
                    <tr className={`border-b border-white/10 text-zinc-400 ${is3Col ? "text-xs" : ""}`}>
                      <th className={is3Col ? "w-[4%] px-1 py-1.5 font-medium sm:px-1.5 sm:py-2" : inSection ? (density === "minimal" || density === "compact" ? "w-[4%] px-0.5 py-1 font-medium sm:py-1" : density === "large" ? "w-[4%] px-2 py-2.5 font-medium sm:px-3 sm:py-3" : "w-[4%] px-1 py-2 font-medium sm:px-2 sm:py-3") : "px-4 py-3 font-medium"}>{lang === "pt" ? "Pos" : "Pos"}</th>
                      <th className={is3Col ? "w-[22%] min-w-0 px-1 py-1.5 font-medium sm:px-1.5 sm:py-2" : inSection ? (density === "minimal" || density === "compact" ? "w-[22%] min-w-0 px-0.5 py-1 font-medium sm:py-1" : density === "large" ? "w-[22%] min-w-0 px-2 py-2.5 font-medium sm:px-3 sm:py-3" : "w-[22%] min-w-0 px-1 py-2 font-medium sm:px-2 sm:py-3") : "px-4 py-3 font-medium"}>{lang === "pt" ? "Time" : "Team"}</th>
                      <th className={is3Col ? "w-[4%] px-1 py-1.5 font-medium sm:px-1.5 sm:py-2" : inSection ? (density === "minimal" || density === "compact" ? "w-[4%] px-0.5 py-1 font-medium sm:py-1" : density === "large" ? "w-[4%] px-2 py-2.5 font-medium sm:px-3 sm:py-3" : "w-[4%] px-1 py-2 font-medium sm:px-2 sm:py-3") : "px-4 py-3 font-medium"}>{lang === "pt" ? "P" : "P"}</th>
                      <th className={is3Col ? "w-[3%] px-1 py-1.5 font-medium sm:px-1.5 sm:py-2" : inSection ? (density === "minimal" || density === "compact" ? "w-[3%] px-0.5 py-1 font-medium sm:py-1" : density === "large" ? "w-[3%] px-2 py-2.5 font-medium sm:px-3 sm:py-3" : "w-[3%] px-1 py-2 font-medium sm:px-2 sm:py-3") : "px-4 py-3 font-medium"}>{lang === "pt" ? "J" : "MP"}</th>
                      <th className={is3Col ? "w-[3%] px-1 py-1.5 font-medium sm:px-1.5 sm:py-2" : inSection ? (density === "minimal" || density === "compact" ? "w-[3%] px-0.5 py-1 font-medium sm:py-1" : density === "large" ? "w-[3%] px-2 py-2.5 font-medium sm:px-3 sm:py-3" : "w-[3%] px-1 py-2 font-medium sm:px-2 sm:py-3") : "px-4 py-3 font-medium"}>{lang === "pt" ? "V" : "W"}</th>
                      <th className={is3Col ? "w-[3%] px-1 py-1.5 font-medium sm:px-1.5 sm:py-2" : inSection ? (density === "minimal" || density === "compact" ? "w-[3%] px-0.5 py-1 font-medium sm:py-1" : density === "large" ? "w-[3%] px-2 py-2.5 font-medium sm:px-3 sm:py-3" : "w-[3%] px-1 py-2 font-medium sm:px-2 sm:py-3") : "px-4 py-3 font-medium"}>{lang === "pt" ? "E" : "D"}</th>
                      <th className={is3Col ? "w-[3%] px-1 py-1.5 font-medium sm:px-1.5 sm:py-2" : inSection ? (density === "minimal" || density === "compact" ? "w-[3%] px-0.5 py-1 font-medium sm:py-1" : density === "large" ? "w-[3%] px-2 py-2.5 font-medium sm:px-3 sm:py-3" : "w-[3%] px-1 py-2 font-medium sm:px-2 sm:py-3") : "px-4 py-3 font-medium"}>{lang === "pt" ? "D" : "L"}</th>
                      <th className={is3Col ? "w-[4%] px-1 py-1.5 font-medium sm:px-1.5 sm:py-2" : inSection ? (density === "minimal" || density === "compact" ? "w-[4%] px-0.5 py-1 font-medium sm:py-1" : density === "large" ? "w-[4%] px-2 py-2.5 font-medium sm:px-3 sm:py-3" : "w-[4%] px-1 py-2 font-medium sm:px-2 sm:py-3") : "px-4 py-3 font-medium"}>{lang === "pt" ? "GP" : "GF"}</th>
                      <th className={is3Col ? "w-[4%] px-1 py-1.5 font-medium sm:px-1.5 sm:py-2" : inSection ? (density === "minimal" || density === "compact" ? "w-[4%] px-0.5 py-1 font-medium sm:py-1" : density === "large" ? "w-[4%] px-2 py-2.5 font-medium sm:px-3 sm:py-3" : "w-[4%] px-1 py-2 font-medium sm:px-2 sm:py-3") : "px-4 py-3 font-medium"}>{lang === "pt" ? "GC" : "GA"}</th>
                      <th className={is3Col ? "w-[5%] px-1 py-1.5 font-medium sm:px-1.5 sm:py-2" : inSection ? (density === "minimal" || density === "compact" ? "w-[5%] px-0.5 py-1 font-medium sm:py-1" : density === "large" ? "w-[5%] px-2 py-2.5 font-medium sm:px-3 sm:py-3" : "w-[5%] px-1 py-2 font-medium sm:px-2 sm:py-3") : "px-4 py-3 font-medium"}>{lang === "pt" ? "SG" : "GD"}</th>
                      <th className={is3Col ? "w-[12%] px-1 py-1.5 font-medium sm:px-1.5 sm:py-2" : inSection ? (density === "minimal" || density === "compact" ? "w-[12%] px-0.5 py-1 font-medium sm:py-1" : density === "large" ? "w-[12%] px-2 py-2.5 font-medium sm:px-3 sm:py-3" : "w-[12%] px-1 py-2 font-medium sm:px-2 sm:py-3") : "px-4 py-3 font-medium"}>{lang === "pt" ? "Últ." : "Last"}</th>
                      <th className={is3Col ? "w-[14%] min-w-0 px-1 py-1.5 font-medium sm:px-1.5 sm:py-2" : inSection ? (density === "minimal" || density === "compact" ? "w-[14%] min-w-0 px-0.5 py-1 font-medium sm:py-1" : density === "large" ? "w-[14%] min-w-0 px-2 py-2.5 font-medium sm:px-3 sm:py-3" : "w-[14%] min-w-0 px-1 py-2 font-medium sm:px-2 sm:py-3") : "px-4 py-3 font-medium"}>{lang === "pt" ? "Próx." : "Next"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedRows.map((row, idx) => (
                      <TabelaRow
                        key={`${row.time}-${row.posicao}-${idx}`}
                        row={row}
                        isFirst={idx === 0}
                        lang={lang}
                        ourTeamName={ourTeamName}
                        ourTeamLogoUrl={ourTeamLogoUrl}
                        inSection={inSection}
                        density={inSection ? density : "normal"}
                        is3Col={is3Col}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function TabelaRow({
  row,
  isFirst,
  lang,
  ourTeamName,
  ourTeamLogoUrl,
  inSection,
  density = "normal",
  is3Col = false,
}: {
  row: TabelaStandingsRow;
  isFirst: boolean;
  lang: "pt" | "en";
  ourTeamName?: string | null;
  ourTeamLogoUrl?: string | null;
  inSection?: boolean;
  density?: "minimal" | "compact" | "normal" | "large";
  is3Col?: boolean;
}) {
  const variacao = row.variacao ?? "same";
  const VariacaoIcon = () => {
    if (variacao === "up") return <span className="text-emerald-400">▲</span>;
    if (variacao === "down") return <span className="text-red-400">▼</span>;
    return <span className="text-zinc-500">•</span>;
  };

  const isOurClub = OUR_CLUB_PLACEHOLDERS.includes((row.time ?? "").trim().toLowerCase());
  const displayName = isOurClub && ourTeamName?.trim() ? ourTeamName.trim() : (row.time ?? "");
  const logoUrl = row.logoTime?.trim()
    ? getPublicImageUrl(row.logoTime)
    : isOurClub && ourTeamLogoUrl?.trim()
      ? getPublicImageUrl(ourTeamLogoUrl)
      : null;
  const logoProximo = row.logoProximo?.trim() ? getPublicImageUrl(row.logoProximo) : null;

  const formItems = (row.ultimosJogos ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-5);

  const formCell = (f: string) => {
    const u = f.toUpperCase();
    const isW = u === "W" || u === "V";
    const isL = u === "L";
    const isD = u === "D" || u === "E";
    const letter = u === "V" ? "W" : u === "E" ? "D" : u.charAt(0);
    const bg = isW ? "bg-emerald-500/80" : isL ? "bg-red-500/80" : "bg-zinc-500/60";
    return { letter, bg };
  };

  const cellClass =
    is3Col
      ? "px-1 py-1.5 sm:px-1.5 sm:py-2"
      : inSection && (density === "minimal" || density === "compact")
        ? density === "minimal"
          ? "px-0.5 py-0.5 sm:py-1"
          : "px-0.5 py-1 sm:py-1.5"
        : inSection && density === "large"
          ? "px-2 py-2.5 sm:px-3 sm:py-3"
          : inSection
            ? "px-1 py-2 sm:px-2 sm:py-3"
            : "px-4 py-3";
  return (
    <tr
      className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
        isFirst ? "bg-amber-500/10" : ""
      }`}
    >
      <td className={cellClass}>
        <span className={`flex items-center font-medium text-white ${inSection ? "gap-0.5" : "gap-1"}`}>
          {row.posicao}
          <VariacaoIcon />
        </span>
      </td>
      <td className={cellClass}>
        <div className={`flex items-center ${is3Col ? "min-w-0 gap-1 sm:gap-1.5" : inSection ? "min-w-0 gap-1.5 sm:gap-2" : "gap-2"} ${!is3Col && inSection && (density === "minimal" || density === "compact") ? "gap-1" : ""}`}>
          {logoUrl ? (
            <div
              className={`relative shrink-0 overflow-hidden rounded-full bg-white/10 ${
                is3Col
                  ? "h-5 w-5 sm:h-6 sm:w-6"
                  : inSection && (density === "minimal" || density === "compact")
                    ? density === "minimal"
                      ? "h-4 w-4 sm:h-5 sm:w-5"
                      : "h-5 w-5 sm:h-6 sm:w-6"
                    : inSection
                      ? "h-6 w-6 sm:h-8 sm:w-8"
                      : "h-8 w-8"
              }`}
            >
              <SmartImage src={logoUrl} alt="" fill className={`object-contain ${inSection ? "p-0.5 sm:p-1" : "p-1"}`} sizes="32px" />
            </div>
          ) : (
            <div
              className={`flex shrink-0 items-center justify-center rounded-full bg-zinc-700/50 font-bold text-zinc-400 ${
                is3Col
                  ? "h-4 w-4 text-[7px] sm:h-5 sm:w-5"
                  : inSection && (density === "minimal" || density === "compact")
                    ? density === "minimal"
                      ? "h-4 w-4 text-[8px] sm:h-5 sm:w-5"
                      : "h-5 w-5 text-[9px] sm:h-6 sm:w-6"
                    : inSection
                      ? "h-6 w-6 text-[10px] sm:h-8 sm:w-8 sm:text-xs"
                      : "h-8 w-8 text-xs"
              }`}
            >
              {displayName?.charAt(0) ?? "?"}
            </div>
          )}
          <span className={`font-medium text-white ${inSection ? "min-w-0 truncate" : ""}`} title={inSection ? displayName ?? undefined : undefined}>{displayName}</span>
        </div>
      </td>
      <td className={`${cellClass} font-semibold text-white`}>{row.pontos}</td>
      <td className={`${cellClass} text-zinc-300`}>{row.jogos}</td>
      <td className={`${cellClass} text-zinc-300`}>{row.vitorias}</td>
      <td className={`${cellClass} text-zinc-300`}>{row.empates}</td>
      <td className={`${cellClass} text-zinc-300`}>{row.derrotas}</td>
      <td className={`${cellClass} text-zinc-300`}>{row.golsMarcados}</td>
      <td className={`${cellClass} text-zinc-300`}>{row.golsSofridos}</td>
      <td className={cellClass}>
        <span className={(row.saldoGols ?? row.golsMarcados - row.golsSofridos) >= 0 ? "text-emerald-400" : "text-red-400"}>
          {(row.saldoGols ?? row.golsMarcados - row.golsSofridos) >= 0 ? "+" : ""}
          {row.saldoGols ?? row.golsMarcados - row.golsSofridos}
        </span>
      </td>
      <td className={cellClass}>
        <div className="flex shrink-0 gap-0.5">
          {formItems.map((f, i) => {
            const { letter, bg } = formCell(f);
            return (
              <span
                key={i}
                className={`flex items-center justify-center rounded font-bold text-white ${bg} ${
                  is3Col
                    ? "h-3.5 w-3.5 text-[7px] sm:h-4 sm:w-4 sm:text-[8px]"
                    : inSection && (density === "minimal" || density === "compact")
                      ? density === "minimal"
                        ? "h-3.5 w-3.5 text-[7px] sm:h-4 sm:w-4 sm:text-[8px]"
                        : "h-4 w-4 text-[8px] sm:h-5 sm:w-5 sm:text-[9px]"
                      : inSection
                        ? "h-5 w-5 text-[9px] sm:h-6 sm:w-6 sm:text-[10px]"
                        : "h-6 w-6 text-[10px]"
                }`}
                title={letter}
              >
                {letter}
              </span>
            );
          })}
        </div>
      </td>
      <td className={cellClass}>
        {row.proximoJogo || logoProximo ? (
          <div className={`flex items-center ${is3Col ? "min-w-0 gap-0.5" : inSection ? "min-w-0 gap-1 sm:gap-1.5" : "gap-2"}`} title={is3Col && row.proximoJogo ? row.proximoJogo : undefined}>
            {logoProximo && (
              <div
                className={`relative shrink-0 overflow-hidden rounded-full bg-white/10 ${
                  is3Col
                    ? "h-5 w-5 sm:h-6 sm:w-6"
                    : inSection && (density === "minimal" || density === "compact")
                      ? density === "minimal"
                        ? "h-3.5 w-3.5 sm:h-4 sm:w-4"
                        : "h-4 w-4 sm:h-5 sm:w-5"
                      : inSection
                        ? "h-5 w-5 sm:h-6 sm:w-6"
                        : "h-6 w-6"
                }`}
              >
                <SmartImage src={logoProximo} alt="" fill className="object-contain p-0.5" sizes="24px" />
              </div>
            )}
            {!is3Col && row.proximoJogo && (
              <span
                className={`text-zinc-300 ${
                  inSection && (density === "minimal" || density === "compact")
                    ? density === "minimal"
                      ? "min-w-0 truncate text-[8px] sm:text-[9px]"
                      : "min-w-0 truncate text-[9px] sm:text-[10px]"
                    : inSection
                      ? "min-w-0 truncate text-[10px] sm:text-xs"
                      : "text-xs"
                }`}
                title={inSection ? row.proximoJogo : undefined}
              >
                {row.proximoJogo}
              </span>
            )}
          </div>
        ) : (
          <span className="text-zinc-600">–</span>
        )}
      </td>
    </tr>
  );
}
