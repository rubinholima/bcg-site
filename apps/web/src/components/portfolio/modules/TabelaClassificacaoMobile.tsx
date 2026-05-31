"use client";

import { useState } from "react";
import type { TabelaStandingsRow } from "@/types/home-content";
import { SmartImage } from "@/components/common/SmartImage";
import { getPublicImageUrl } from "@/lib/media-url";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { isOurTeam } from "@/components/portfolio/FixtureTeamLogo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

const OUR_CLUB_PLACEHOLDERS = ["nosso clube", "our club"];
const FILTER_ALL = "__all__";

function formDot(f: string): { letter: string; bg: string } {
  const u = f.toUpperCase();
  const isW = u === "W" || u === "V";
  const isL = u === "L";
  const letter = u === "V" ? "W" : u === "E" ? "D" : u.charAt(0);
  const bg = isW ? "bg-emerald-500" : isL ? "bg-red-500" : "bg-zinc-500";
  return { letter, bg };
}

function MobileStandingCard({
  row,
  lang,
  ourTeamName,
  ourTeamLogoUrl,
  rank,
}: {
  row: TabelaStandingsRow;
  lang: "pt" | "en";
  ourTeamName?: string | null;
  ourTeamLogoUrl?: string | null;
  rank: number;
}) {
  const [open, setOpen] = useState(false);
  const isOurClub =
    OUR_CLUB_PLACEHOLDERS.includes((row.time ?? "").trim().toLowerCase()) ||
    isOurTeam(row.time ?? "", ourTeamName);
  const displayName =
    isOurClub && ourTeamName?.trim() ? ourTeamName.trim() : (row.time ?? "");
  const logoUrl = row.logoTime?.trim()
    ? getPublicImageUrl(row.logoTime)
    : isOurClub && ourTeamLogoUrl?.trim()
      ? getPublicImageUrl(ourTeamLogoUrl)
      : null;
  const sg = row.saldoGols ?? row.golsMarcados - row.golsSofridos;
  const formItems = (row.ultimosJogos ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-5);
  const logoProximo = row.logoProximo?.trim() ? getPublicImageUrl(row.logoProximo) : null;
  const isTop3 = rank <= 3;

  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className={`w-full rounded-xl border text-left transition ${
        isOurClub
          ? "border-amber-500/40 bg-amber-500/10"
          : isTop3
            ? "border-white/10 bg-zinc-900/80"
            : "border-white/5 bg-zinc-900/50"
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
            rank === 1
              ? "bg-amber-500 text-black"
              : rank === 2
                ? "bg-zinc-300 text-zinc-900"
                : rank === 3
                  ? "bg-amber-700/80 text-white"
                  : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {row.posicao ?? rank}
        </div>

        {logoUrl ? (
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/10">
            <SmartImage src={logoUrl} alt="" fill className="object-contain p-0.5" sizes="36px" />
          </div>
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-400">
            {displayName.charAt(0)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{displayName}</p>
          <p className="text-[11px] text-zinc-500">
            {row.jogos}J · {row.vitorias}V · {row.empates}E · {row.derrotas}D
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lg font-black tabular-nums text-white">{row.pontos}</p>
          <p className={`text-[11px] font-medium tabular-nums ${sg >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {sg >= 0 ? "+" : ""}
            {sg}
          </p>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`}
        />
      </div>

      {open && (
        <div className="border-t border-white/5 px-3 pb-3 pt-2">
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-lg bg-zinc-950/50 py-2">
              <p className="text-zinc-500">{lang === "pt" ? "Gols" : "Goals"}</p>
              <p className="font-bold text-white">
                {row.golsMarcados}:{row.golsSofridos}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-950/50 py-2">
              <p className="text-zinc-500">{lang === "pt" ? "Forma" : "Form"}</p>
              <div className="mt-1 flex justify-center gap-0.5">
                {formItems.length > 0 ? (
                  formItems.map((f, i) => {
                    const { letter, bg } = formDot(f);
                    return (
                      <span
                        key={i}
                        className={`flex h-4 w-4 items-center justify-center rounded text-[8px] font-bold text-white ${bg}`}
                      >
                        {letter}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-zinc-600">–</span>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-zinc-950/50 py-2">
              <p className="text-zinc-500">{lang === "pt" ? "Próx." : "Next"}</p>
              <div className="mt-1 flex items-center justify-center gap-1">
                {logoProximo ? (
                  <div className="relative h-5 w-5 overflow-hidden rounded-full bg-white/10">
                    <SmartImage src={logoProximo} alt="" fill className="object-contain p-0.5" sizes="20px" />
                  </div>
                ) : null}
                <span className="truncate text-[10px] font-medium text-zinc-300">
                  {row.proximoJogo?.trim() || "–"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </button>
  );
}

export function TabelaClassificacaoMobile({
  rows,
  lang,
  ourTeamName,
  ourTeamLogoUrl,
  competicoes,
  competicaoSel,
  onCompeticaoChange,
  categorias,
  categoriaSel,
  onCategoriaChange,
  temporadas,
  temporadaSel,
  onTemporadaChange,
}: {
  rows: TabelaStandingsRow[];
  lang: "pt" | "en";
  ourTeamName?: string | null;
  ourTeamLogoUrl?: string | null;
  competicoes: string[];
  competicaoSel: string;
  onCompeticaoChange: (v: string) => void;
  categorias: string[];
  categoriaSel: string;
  onCategoriaChange: (v: string) => void;
  temporadas: string[];
  temporadaSel: string;
  onTemporadaChange: (v: string) => void;
}) {
  const showCompSelect = competicoes.length > 1;
  const showCatSelect = categorias.length > 1;
  const showTempSelect = temporadas.length > 1;

  return (
    <div className="space-y-3 md:hidden">
      {(showCompSelect || showCatSelect || showTempSelect) && (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-zinc-900/70 p-3">
          {showCompSelect && competicaoSel && (
            <Select value={competicaoSel} onValueChange={onCompeticaoChange}>
              <SelectTrigger className="h-11 w-full border-white/10 bg-zinc-800/60 text-sm text-white">
                <SelectValue placeholder={lang === "pt" ? "Campeonato" : "Competition"} />
              </SelectTrigger>
              <SelectContent>
                {competicoes.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!showCompSelect && competicaoSel && (
            <p className="truncate text-center text-xs font-medium uppercase tracking-wide text-amber-400/90">
              {competicaoSel}
            </p>
          )}
          {(showCatSelect || showTempSelect) && (
            <div className="flex gap-2">
              {showCatSelect && (
                <Select value={categoriaSel} onValueChange={onCategoriaChange}>
                  <SelectTrigger className="h-10 min-w-0 flex-1 border-white/10 bg-zinc-800/60 text-xs text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>{lang === "pt" ? "Todas cat." : "All cat."}</SelectItem>
                    {categorias.map((c) => (
                      <SelectItem key={c} value={c}>
                        {getCategoryLabel(c, lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {showTempSelect && (
                <Select value={temporadaSel} onValueChange={onTemporadaChange}>
                  <SelectTrigger className="h-10 min-w-0 flex-1 border-white/10 bg-zinc-800/60 text-xs text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>{lang === "pt" ? "Temp." : "Season"}</SelectItem>
                    {temporadas.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row, idx) => (
          <MobileStandingCard
            key={`${row.time}-m-${idx}`}
            row={row}
            lang={lang}
            ourTeamName={ourTeamName}
            ourTeamLogoUrl={ourTeamLogoUrl}
            rank={row.posicao ?? idx + 1}
          />
        ))}
      </div>
    </div>
  );
}
